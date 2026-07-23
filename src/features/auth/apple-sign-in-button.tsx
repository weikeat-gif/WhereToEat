import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ResolvedThemeMode } from '@/theme/tokens';

export function AppleSignInButton({
  disabled,
  onPress,
  theme,
}: {
  disabled: boolean;
  onPress: () => void;
  theme: ResolvedThemeMode;
}) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    void AppleAuthentication.isAvailableAsync()
      .then((isAvailable) => {
        if (active) setAvailable(isAvailable);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!available) return null;

  return (
    <View style={disabled ? styles.disabled : undefined}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonStyle={
          theme === 'dark'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        buttonType={
          AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
        }
        cornerRadius={999}
        onPress={() => {
          if (!disabled) onPress();
        }}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { height: 48, width: '100%' },
  disabled: { opacity: 0.45 },
});
