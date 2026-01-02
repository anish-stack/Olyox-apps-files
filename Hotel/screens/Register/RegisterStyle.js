import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  cards: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formContainer: {
    marginTop: 16,
  },

  // Typography styles
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 6,
  },

  // Form input styles
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#212529',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },

  // Message box styles
  errorBox: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c2c7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
  },
  successBox: {
    backgroundColor: '#d1e7dd',
    borderColor: '#badbcc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
  },
  successText: {
    color: '#0f5132',
    fontSize: 14,
  },

  // Button styles
  button: {
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.65,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // New styles for date picker
  datePickerContainer: {
    marginBottom: 16,
  },
  dateButton: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#212529',
  },
  
  // Additional input container style
  inputContainer: {
    marginBottom: 16,
  },
  
  // Address form section
  addressSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  addressSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  
  // Row layout for side-by-side inputs
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidthInput: {
    width: (width - 72) / 2, // Adjusts for padding and margin
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
  },
  
  // Helper text
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  }
});

export default styles;