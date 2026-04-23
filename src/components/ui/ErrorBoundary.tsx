import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text variant="headlineSmall" style={styles.title}>Something went wrong</Text>
          <Text variant="bodyMedium" style={styles.message}>{this.state.error}</Text>
          <Button mode="contained" onPress={() => this.setState({ hasError: false, error: '' })} style={styles.button}>
            Try Again
          </Button>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontWeight: '700', marginBottom: 8 },
  message: { textAlign: 'center', marginBottom: 24, opacity: 0.7 },
  button: { minWidth: 160, borderRadius: 12 },
});
