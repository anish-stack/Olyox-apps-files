// ---------------------------------------------------------------
// CropScreen.js  → FREE CROP + NO BLACK SCREEN + NO ERROR
// ---------------------------------------------------------------
import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: winW, height: winH } = Dimensions.get('window');

export default function CropScreen({
  visible,
  imageUri,
  onCrop,
  onCancel,
}) {
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [rect, setRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [loading, setLoading] = useState(true);

  // Step 1: Get original size & initialize crop
  useEffect(() => {
    if (!imageUri) return;

    Image.getSize(
      imageUri,
      (originalW, originalH) => {
        // Fit image in 70% screen
        const scale = Math.min(winW / originalW, (winH * 0.7) / originalH);
        const displayW = originalW * scale;
        const displayH = originalH * scale;

        setImgSize({ width: displayW, height: displayH });

        // Free crop: start with 80% of smaller side
        const size = Math.min(displayW, displayH) * 0.8;
        const x = (displayW - size) / 2;
        const y = (displayH - size) / 2;

        setRect({ x, y, width: size, height: size });
        setLoading(false);
      },
      (err) => {
        console.warn('getSize failed', err);
        setLoading(false);
      }
    );
  }, [imageUri]);

  // Move crop box
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      setRect((prev) => {
        const newX = prev.x + gesture.dx;
        const newY = prev.y + gesture.dy;
        const maxX = imgSize.width - prev.width;
        const maxY = imgSize.height - prev.height;
        return {
          ...prev,
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        };
      });
    },
  });

  // Resize any corner → FREE (no aspect lock)
const resizeCorner = (corner) => {
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      setRect((prev) => {
        let { x, y, width, height } = prev;

        // Compute next dimensions
        if (corner === 'tl') {
          const nextX = Math.min(prev.x + gesture.dx, prev.x + prev.width - 5);
          const nextY = Math.min(prev.y + gesture.dy, prev.y + prev.height - 5);
          width = prev.width - (nextX - prev.x);
          height = prev.height - (nextY - prev.y);
          x = nextX;
          y = nextY;
        } else if (corner === 'tr') {
          const nextY = Math.min(prev.y + gesture.dy, prev.y + prev.height - 5);
          width = prev.width + gesture.dx;
          height = prev.height - (nextY - prev.y);
          y = nextY;
        } else if (corner === 'bl') {
          const nextX = Math.min(prev.x + gesture.dx, prev.x + prev.width - 5);
          width = prev.width - (nextX - prev.x);
          height = prev.height + gesture.dy;
          x = nextX;
        } else if (corner === 'br') {
          width = prev.width + gesture.dx;
          height = prev.height + gesture.dy;
        }

        // Clamp inside image
        if (x < 0) { width += x; x = 0; }
        if (y < 0) { height += y; y = 0; }
        if (x + width > imgSize.width) width = imgSize.width - x;
        if (y + height > imgSize.height) height = imgSize.height - y;

        // Allow very small crops (as small as 5px)
        if (width < 5) width = 5;
        if (height < 5) height = 5;

        return { x, y, width, height };
      });
    },
  }).panHandlers;
};


  // Crop using CORRECT scale
const performCrop = async () => {
  if (loading || !imgSize.width) return;

  try {
    const [originalW, originalH] = await new Promise((resolve, reject) =>
      Image.getSize(imageUri, (w, h) => resolve([w, h]), reject)
    );

    const scaleX = originalW / imgSize.width;
    const scaleY = originalH / imgSize.height;

    let cropRect = {
      originX: Math.max(0, Math.round(rect.x * scaleX)),
      originY: Math.max(0, Math.round(rect.y * scaleY)),
      width: Math.max(1, Math.round(rect.width * scaleX)),
      height: Math.max(1, Math.round(rect.height * scaleY)),
    };

    // Ensure cropRect is fully inside the original image
    if (cropRect.originX + cropRect.width > originalW) {
      cropRect.width = originalW - cropRect.originX;
    }
    if (cropRect.originY + cropRect.height > originalH) {
      cropRect.height = originalH - cropRect.originY;
    }

    console.log("🟢 Cropping with rect:", cropRect, "Original:", originalW, originalH);

    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ crop: cropRect }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );

    await onCrop(result.uri);
  } catch (e) {
    console.warn("🚫 Crop failed:", e.message);
  }
};


  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modal}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : (
          <>
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: imgSize.width, height: imgSize.height }}
                resizeMode="contain"
              />

              <View
                style={[
                  styles.cropBox,
                  {
                    left: rect.x,
                    top: rect.y,
                    width: rect.width,
                    height: rect.height,
                  },
                ]}
                {...panResponder.panHandlers}
              >
                <View style={styles.cornerTL} {...resizeCorner('tl')} />
                <View style={styles.cornerTR} {...resizeCorner('tr')} />
                <View style={styles.cornerBL} {...resizeCorner('bl')} />
                <View style={styles.cornerBR} {...resizeCorner('br')} />
              </View>
            </View>

            <View style={styles.buttonBar}>
              <TouchableOpacity style={styles.btn} onPress={onCancel}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={performCrop}>
                <Ionicons name="checkmark" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cornerTL: { position: 'absolute', left: -12, top: -12, width: 24, height: 24, backgroundColor: '#fff', borderRadius: 12 },
  cornerTR: { position: 'absolute', right: -12, top: -12, width: 24, height: 24, backgroundColor: '#fff', borderRadius: 12 },
  cornerBL: { position: 'absolute', left: -12, bottom: -12, width: 24, height: 24, backgroundColor: '#fff', borderRadius: 12 },
  cornerBR: { position: 'absolute', right: -12, bottom: -12, width: 24, height: 24, backgroundColor: '#fff', borderRadius: 12 },
  buttonBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});