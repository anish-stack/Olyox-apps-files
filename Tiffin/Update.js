import { View } from "react-native";
import AppUpdater from "./updater/AppUpdater";

export const AppWithUpdater = ({ children, apiUrl }) => {
    return (
      <View style={{ flex: 1 }}>
        {children}
        <AppUpdater 
          apiUrl={apiUrl || "https://appapi.olyox.com/api/v1/admin/app-version/by-type/tiffin_vendor"} 
          onClose={() => console.log('Update modal closed')}
         
            
     
        />
         {/* release {
            storeFile file('olyoix-tiffin-release.keystore')
            storePassword 'olyoix_tiffin'
            keyAlias 'olyoix_tiffin'
            keyPassword 'olyoix_tiffin' */}
      </View>
    );
  };