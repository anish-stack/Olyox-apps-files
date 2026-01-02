import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TagInputField({ 
  label, 
  tags, 
  onTagsChange, 
  placeholder = 'Type and press Enter',
  required = false 
}) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    if (inputValue.trim() !== '') {
      const newTags = [...tags, inputValue.trim()];
      onTagsChange(newTags);
      setInputValue('');
    }
  };

  const removeTag = (index) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    onTagsChange(newTags);
  };

  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === 'Enter' && inputValue.trim() !== '') {
      addTag();
    }
  };

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
        
      </Text>
      
      <View style={styles.inputContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContainer}
        >
          {tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(index)}>
                <Ionicons name="close-circle" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={tags.length === 0 ? placeholder : ''}
            onSubmitEditing={addTag}
            onKeyPress={handleKeyPress}
            blurOnSubmit={false}
          />
        </ScrollView>
      </View>
      
      <Text style={styles.helperText}>Type and press Enter to add a tag</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '500',
  },
  required: {
    color: 'red',
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    minHeight: 50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginVertical: 4,
  },
  tagText: {
    color: '#fff',
    marginRight: 6,
    fontSize: 14,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    minWidth: 100,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});