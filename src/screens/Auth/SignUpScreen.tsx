import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword } from '../../utils/validation';
import { useAppTheme } from '../../config/themes';
import type { AuthScreenProps } from '../../types/navigation';

export default function SignUpScreen({ navigation }: AuthScreenProps<'SignUp'>) {
  const theme = useAppTheme();
  const { signUp, pendingConfirmation, clearPendingConfirmation } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async () => {
    setError('');
    if (!fullName.trim()) { setError('Full name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email'); return; }

    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await signUp(email, password, fullName.trim());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    clearPendingConfirmation();
    navigation.goBack();
  };

  // Show confirmation pending screen
  if (pendingConfirmation) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
        <View style={styles.confirmContainer}>
          <MaterialCommunityIcons name="email-check-outline" size={80} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={[styles.confirmTitle, { color: theme.colors.onBackground }]}>
            Check Your Email
          </Text>
          <Text variant="bodyLarge" style={[styles.confirmText, { color: theme.colors.textSecondary }]}>
            We've sent a confirmation link to
          </Text>
          <Text variant="bodyLarge" style={[styles.confirmEmail, { color: theme.colors.primary }]}>
            {email}
          </Text>
          <Text variant="bodyMedium" style={[styles.confirmHint, { color: theme.colors.textSecondary }]}>
            Click the link in the email to verify your account, then come back and sign in.
          </Text>
          <Button
            mode="contained"
            onPress={handleBackToSignIn}
            style={styles.confirmButton}
            contentStyle={styles.buttonContent}
          >
            Go to Sign In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
              Create Account
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.textSecondary }}>
              Get matched with the perfect jobs
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              mode="outlined"
              left={<TextInput.Icon icon="account-outline" />}
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
            />

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              mode="outlined"
              left={<TextInput.Icon icon="email-outline" />}
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
            />

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              left={<TextInput.Icon icon="lock-check-outline" />}
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
            />

            {error ? (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Create Account
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              style={styles.link}
            >
              Already have an account? Sign In
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontWeight: '800', marginBottom: 8 },
  form: { width: '100%' },
  input: { marginBottom: 12 },
  button: { marginTop: 8, borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
  link: { marginTop: 16 },
  confirmContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmTitle: { fontWeight: '700', marginTop: 24, marginBottom: 12 },
  confirmText: { textAlign: 'center' },
  confirmEmail: { fontWeight: '600', marginTop: 4, marginBottom: 16 },
  confirmHint: { textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  confirmButton: { borderRadius: 12, minWidth: 200 },
});
