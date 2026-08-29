const { ZxcvbnFactory } = require('@zxcvbn-ts/core');
const zxcvbnCommonPackage = require('@zxcvbn-ts/language-common');
const zxcvbnEnPackage = require('@zxcvbn-ts/language-en');

// Set up the options with built-in dictionaries & graph patterns
const options = {
    dictionary: {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnEnPackage.dictionary,
    },
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    translations: zxcvbnEnPackage.translations,
};

// Create the checker instance
const zxcvbn = new ZxcvbnFactory(options);

/**
 * Validates a password's strength.
 * Returns { isValid: boolean, score: number, warning: string }
 */
const checkPasswordStrength = (password) => {
    if (!password) {
        return { isValid: false, score: 0, warning: 'Password is required' };
    }

    const result = zxcvbn.check(password);

    // Scores range from 0 (very weak) to 4 (very strong)
    // 0 = Too guessable (e.g. top common password)
    // 1 = Very guessable
    // 2 = Somewhat guessable
    // 3 = Safely unguessable
    // 4 = Very unguessable
    
    const isValid = result.score >= 2; // Require at least score 2 (or 3 for stricter security)

    return {
        isValid,
        score: result.score,
        warning: result.feedback.warning || (isValid ? null : 'Password is too weak or easy to guess.'),
        suggestions: result.feedback.suggestions
    };
};

module.exports = { checkPasswordStrength };