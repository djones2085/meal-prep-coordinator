export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIRE_UPPERCASE = true;
export const PASSWORD_REQUIRE_LOWERCASE = true;
export const PASSWORD_REQUIRE_NUMBER = true;
export const PASSWORD_REQUIRE_SPECIAL_CHAR = true;

export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()]/;
export const UPPERCASE_REGEX = /[A-Z]/;
export const LOWERCASE_REGEX = /[a-z]/;
export const NUMBER_REGEX = /[0-9]/;

export const getPasswordStrengthErrors = (password) => {
    const errors = [];
    if (password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`);
    }
    if (PASSWORD_REQUIRE_UPPERCASE && !UPPERCASE_REGEX.test(password)) {
        errors.push('Password must contain at least one uppercase letter.');
    }
    if (PASSWORD_REQUIRE_LOWERCASE && !LOWERCASE_REGEX.test(password)) {
        errors.push('Password must contain at least one lowercase letter.');
    }
    if (PASSWORD_REQUIRE_NUMBER && !NUMBER_REGEX.test(password)) {
        errors.push('Password must contain at least one number.');
    }
    if (PASSWORD_REQUIRE_SPECIAL_CHAR && !SPECIAL_CHAR_REGEX.test(password)) {
        errors.push('Password must contain at least one special character (e.g., !@#$%^&*()).');
    }
    return errors;
};

export const isPasswordSecure = (password) => {
    return getPasswordStrengthErrors(password).length === 0;
};

export const passwordRequirementsMessage = () => {
    const messages = [
        `Be at least ${PASSWORD_MIN_LENGTH} characters long.`,
        PASSWORD_REQUIRE_UPPERCASE ? 'Include at least one uppercase letter.' : '',
        PASSWORD_REQUIRE_LOWERCASE ? 'Include at least one lowercase letter.' : '',
        PASSWORD_REQUIRE_NUMBER ? 'Include at least one number.' : '',
        PASSWORD_REQUIRE_SPECIAL_CHAR ? 'Include at least one special character (e.g., !@#$%^&*()).' : '',
    ].filter(Boolean); // Remove empty strings if some requirements are false
    return "Password must: " + messages.join(' ');
}; 