import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';

import { GlassPanel } from './GlassPanel';
import { SmallCapsLabel } from './SmallCapsLabel';
import { fonts } from '../theme/tokens';
import { useCircadianColors } from '../theme/CircadianThemeProvider';
import { useThemedStyles } from '../theme/useThemedStyles';
import {
  getSupabaseSession,
  isSupabaseConfigured,
  signInWithEmail,
  signOutSupabase,
  signUpWithEmail,
} from '../services/supabaseAuth';
import { linkAnonymousIdentityIfNeeded } from '../services/identity';

export function AuthCard() {
  const colors = useCircadianColors();
  const styles = useThemedStyles((c) => ({
    panel: { marginTop: 20 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
      fontFamily: fonts.body,
      marginBottom: 10,
    },
    button: {
      backgroundColor: c.accent,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.border,
    },
    buttonText: {
      color: c.text,
      fontFamily: fonts.bodyS,
      fontSize: 14,
    },
    status: {
      marginTop: 8,
      fontSize: 13,
      color: c.textSec,
      fontFamily: fonts.body,
    },
    error: {
      marginTop: 8,
      fontSize: 13,
      color: '#E8A04A',
      fontFamily: fonts.body,
    },
  }));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const session = await getSupabaseSession();
    setSignedInEmail(session?.user?.email ?? null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!isSupabaseConfigured()) {
    return null;
  }

  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      await linkAnonymousIdentityIfNeeded();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const onSignUp = async () => {
    setBusy(true);
    setError(null);
    try {
      await signUpWithEmail(email.trim(), password);
      await linkAnonymousIdentityIfNeeded();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOutSupabase();
      setSignedInEmail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassPanel style={styles.panel}>
      <SmallCapsLabel>Account</SmallCapsLabel>
      {signedInEmail ? (
        <>
          <Text style={styles.status}>Signed in as {signedInEmail}</Text>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => void onSignOut()}
            disabled={busy}
          >
            <Text style={styles.buttonText}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textSec}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textSec}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable style={styles.button} onPress={() => void onSignIn()} disabled={busy}>
            <Text style={styles.buttonText}>Sign in</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => void onSignUp()}
            disabled={busy}
          >
            <Text style={styles.buttonText}>Create account</Text>
          </Pressable>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </GlassPanel>
  );
}
