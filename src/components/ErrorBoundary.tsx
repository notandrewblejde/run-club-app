import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary so a thrown render error shows a fallback screen
 * instead of bubbling up to React Native's global handler — which calls
 * RCTFatal in release builds and instantly kills the app. With this in place
 * the user at least sees something, and we can show the error text in dev to
 * make debugging easier.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Console output is captured by Xcode/device logs in release. Helpful when
    // reproducing a TestFlight crash via `expo run:ios --configuration Release`.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The app hit an unexpected error. Try again — if it keeps happening,
          please let us know.
        </Text>
        {__DEV__ ? (
          <Text style={styles.errText} numberOfLines={6}>
            {this.state.error.message}
          </Text>
        ) : null}
        <TouchableOpacity style={styles.cta} onPress={this.reset} activeOpacity={0.85}>
          <Text style={styles.ctaLabel}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0F0F0F',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  body: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    marginBottom: 24,
    textAlign: 'center',
  },
  cta: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  ctaLabel: { color: '#0F0F0F', fontWeight: '600', fontSize: 14 },
});
