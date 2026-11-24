import Ionicons from '@expo/vector-icons/Ionicons';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H_INSET, hapticLight } from '../theme';
import { getBottomInsetPadding } from './Screen';

// Botón de acción principal o secundario con altura fija (NUNCA flex: 1 vertical).
export function Button({
  c,
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled = false,
  compact = false,
  style,
}) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  const bg = isPrimary
    ? c.accent
    : isSecondary
      ? c.surfaceAlt
      : isDanger
        ? c.danger
        : 'transparent';

  const fg = isPrimary || isDanger ? c.onAccent : isSecondary ? c.fg : c.accent;

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapticLight();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        { backgroundColor: bg },
        isGhost && styles.btnGhost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={compact ? 17 : 19} color={fg} /> : null}
      <Text
        numberOfLines={1}
        style={[styles.btnText, compact && styles.btnTextCompact, { color: fg }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Botón de ícono cuadrado >= 44×44 pt (Apple HIG / ley de Fitts).
export function IconButton({
  c,
  name,
  onPress,
  accessibilityLabel,
  color,
  size = 20,
  surface = true,
  disabled = false,
  hitSlop = 6,
  style,
}) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      onPress={() => {
        hapticLight();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.iconBtn,
        surface && {
          backgroundColor: c.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.line,
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.iconPressed,
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color || c.fg} />
    </Pressable>
  );
}

// Botón de volver estilo iOS con truncado seguro para evitar colisiones en el header.
export function BackButton({ c, label = 'Volver', onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Volver a ${label}`}
      hitSlop={8}
      onPress={() => {
        hapticLight();
        onPress?.();
      }}
      style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
    >
      <Ionicons name="chevron-back" size={22} color={c.accent} style={styles.backIcon} />
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.backText, { color: c.accent }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// Header balanceado: el bloque izquierdo encoge (flexShrink: 1) y el derecho nunca se pisa ni se sale.
export function HeaderBar({ left, right, style }) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerLeft}>{left}</View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function EmptyState({ c, icon, title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyBadge, { backgroundColor: c.accentSoft }]}>
        <Ionicons name={icon} size={28} color={c.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.fg }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySub, { color: c.sub }]}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button c={c} label={actionLabel} icon="add" onPress={onAction} style={styles.emptyCta} />
      ) : null}
    </View>
  );
}

// Modal de renombrado con KeyboardAvoidingView para que el teclado de iPhone nunca tape los botones.
export function RenameModal({ c, prompt, onChange, onCancel, onConfirm }) {
  if (!prompt) return null;
  const canSave = !!prompt.value?.trim();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: c.surface,
              borderColor: c.line,
              marginHorizontal: H_INSET,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: c.fg }]}>{prompt.label}</Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: c.surfaceAlt,
                color: c.fg,
                borderColor: c.line,
              },
            ]}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            value={prompt.value ?? ''}
            placeholderTextColor={c.sub}
            onChangeText={onChange}
            onSubmitEditing={() => {
              if (canSave) onConfirm();
            }}
          />
          <View style={styles.modalActions}>
            <Button
              c={c}
              variant="secondary"
              label="Cancelar"
              onPress={onCancel}
              style={styles.modalActionBtn}
            />
            <Button
              c={c}
              variant="primary"
              label="Guardar"
              disabled={!canSave}
              onPress={onConfirm}
              style={styles.modalActionBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ActionSheet / Confirmación / Aviso cross-platform (funciona idéntico en iPhone PWA, Android PWA y Expo Go).
export function ActionSheetModal({ c, sheet, onClose }) {
  const insets = useSafeAreaInsets();
  if (!sheet) return null;

  const actions = sheet.actions || [];
  const isNotice = actions.length === 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: c.surface,
              borderColor: c.line,
              paddingBottom: getBottomInsetPadding(insets.bottom, 18),
              paddingLeft: Platform.OS === 'web' ? H_INSET : insets.left + H_INSET,
              paddingRight: Platform.OS === 'web' ? H_INSET : insets.right + H_INSET,
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: c.line }]} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: c.fg }]}>{sheet.title}</Text>
            {sheet.message ? (
              <Text style={[styles.sheetMessage, { color: c.sub }]}>{sheet.message}</Text>
            ) : null}
          </View>

          {actions.length > 0 ? (
            <View style={styles.sheetList}>
              {actions.map((act, idx) => {
                const isDestructive = !!act.destructive;
                const isPrimary = !!act.primary;
                const rowBg = isDestructive
                  ? c.dangerSoft
                  : isPrimary
                    ? c.accent
                    : c.surfaceAlt;
                const rowFg = isDestructive
                  ? c.danger
                  : isPrimary
                    ? c.onAccent
                    : c.fg;

                return (
                  <Pressable
                    key={`${act.label}-${idx}`}
                    accessibilityRole="button"
                    accessibilityLabel={act.label}
                    onPress={() => {
                      hapticLight();
                      onClose();
                      act.onPress?.();
                    }}
                    style={({ pressed }) => [
                      styles.sheetAction,
                      { backgroundColor: rowBg },
                      pressed && styles.pressed,
                    ]}
                  >
                    {act.icon ? <Ionicons name={act.icon} size={19} color={rowFg} /> : null}
                    <Text style={[styles.sheetActionText, { color: rowFg }]}>{act.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Button
            c={c}
            variant={isNotice ? 'primary' : 'ghost'}
            label={sheet.cancelLabel || (isNotice ? 'Entendido' : 'Cancelar')}
            onPress={onClose}
            style={styles.sheetCancel}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnCompact: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  btnGhost: {
    paddingHorizontal: 10,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  btnTextCompact: {
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  backBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingRight: 8,
    maxWidth: '100%',
  },
  backIcon: {
    marginLeft: -5,
    marginRight: 1,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 44,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyCta: {
    marginTop: 8,
    paddingHorizontal: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  modalInput: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  modalActionBtn: {
    flex: 1,
    height: 48,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    gap: 5,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sheetMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  sheetList: {
    gap: 9,
  },
  sheetAction: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  sheetActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetCancel: {
    marginTop: 10,
    height: 48,
  },
});
