/// Password validation utility for enforcing security requirements.
class PasswordValidator {
  static const int minLength = 8;
  static const int maxLength = 128;

  /// Validates password strength and returns error message if invalid.
  /// Returns null if password is valid.
  static String? validate(String password) {
    if (password.isEmpty) {
      return 'Password is required';
    }

    if (password.length < minLength) {
      return 'Password must be at least $minLength characters';
    }

    if (password.length > maxLength) {
      return 'Password must be less than $maxLength characters';
    }

    // Check for at least one uppercase letter
    if (!password.contains(RegExp(r'[A-Z]'))) {
      return 'Password must contain at least one uppercase letter';
    }

    // Check for at least one lowercase letter
    if (!password.contains(RegExp(r'[a-z]'))) {
      return 'Password must contain at least one lowercase letter';
    }

    // Check for at least one number
    if (!password.contains(RegExp(r'[0-9]'))) {
      return 'Password must contain at least one number';
    }

    // Check for at least one special character
    if (!password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) {
      return 'Password must contain at least one special character (!@#\$%^&*...)';
    }

    return null; // Valid
  }

  /// Get password strength (0-4) for UI feedback.
  static int getStrength(String password) {
    int strength = 0;

    if (password.length >= minLength) strength++;
    if (password.contains(RegExp(r'[A-Z]'))) strength++;
    if (password.contains(RegExp(r'[a-z]'))) strength++;
    if (password.contains(RegExp(r'[0-9]'))) strength++;
    if (password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) strength++;

    return strength;
  }

  /// Get password strength label for UI.
  static String getStrengthLabel(int strength) {
    switch (strength) {
      case 0:
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
      case 5:
        return 'Strong';
      default:
        return 'None';
    }
  }

  /// Get requirements checklist for UI.
  static Map<String, bool> getRequirements(String password) {
    return {
      'At least $minLength characters': password.length >= minLength,
      'Contains uppercase letter': password.contains(RegExp(r'[A-Z]')),
      'Contains lowercase letter': password.contains(RegExp(r'[a-z]')),
      'Contains number': password.contains(RegExp(r'[0-9]')),
      'Contains special character': password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]')),
    };
  }
}
