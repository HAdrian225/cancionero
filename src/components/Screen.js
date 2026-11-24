import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H_INSET } from '../theme';

export function getBottomInsetPadding(insetsBottom, minPad = 14) {
  if (Platform.OS === 'web') {
    return `max(calc(env(safe-area-inset-bottom, 0px) + ${minPad}px), ${minPad}px)`;
  }
  return Math.max(insetsBottom, minPad);
}

// Contenedor base con insets reales de iOS/Android y CSS env() para PWA en iPhone Safari,
// más sangría lateral anti-vidrio templado (H_INSET = 22 pt) y centrado limpio en pantallas anchas.
export function Screen({ c, children, keyboardAvoiding = false, noHorizontalInset = false }) {
  const insets = useSafeAreaInsets();

  const paddingStyle =
    Platform.OS === 'web'
      ? {
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 10px), 12px)',
          paddingBottom: getBottomInsetPadding(0, 14),
          paddingLeft: noHorizontalInset
            ? 'env(safe-area-inset-left, 0px)'
            : `calc(env(safe-area-inset-left, 0px) + ${H_INSET}px)`,
          paddingRight: noHorizontalInset
            ? 'env(safe-area-inset-right, 0px)'
            : `calc(env(safe-area-inset-right, 0px) + ${H_INSET}px)`,
        }
      : {
          paddingTop: insets.top + 6,
          paddingBottom: Math.max(insets.bottom, 14),
          paddingLeft: noHorizontalInset ? insets.left : insets.left + H_INSET,
          paddingRight: noHorizontalInset ? insets.right : insets.right + H_INSET,
        };

  const innerStyle = [styles.inner, Platform.OS === 'web' && styles.webFrame, paddingStyle];

  if (keyboardAvoiding && Platform.OS !== 'web') {
    return (
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: c.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={innerStyle}>{children}</View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={innerStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
  },
  webFrame: {
    maxWidth: 540,
    alignSelf: 'center',
  },
});
