import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Options for picking several photos from the library.
 *
 * On iOS, `PHPickerViewController` with the default automatic modal style is often a page
 * sheet; combined with React Navigation that can prevent `didFinishPicking` from resolving
 * (blue check appears to do nothing). Full-screen presentation avoids that stuck state.
 */
export function libraryMultiImagePickerOptions(): ImagePicker.ImagePickerOptions {
  return {
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.8,
    allowsMultipleSelection: true,
    selectionLimit: Platform.OS === 'ios' ? 24 : 0,
    ...(Platform.OS === 'ios'
      ? { presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN }
      : {}),
  };
}
