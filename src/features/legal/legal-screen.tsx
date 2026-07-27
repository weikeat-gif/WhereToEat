import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily, radius, spacing } from '@/theme/tokens';

type LegalKind = 'privacy' | 'terms';

const GOOGLE_PRIVACY_URL = 'https://policies.google.com/privacy';
const GOOGLE_TERMS_URL = 'https://maps.google.com/help/terms_maps/';

export function LegalScreen({ kind }: { kind: LegalKind }) {
  const { colors } = useAppTheme();
  const isPrivacy = kind === 'privacy';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            accessibilityLabel="Go back"
            backgroundColor={colors.surface}
            color={colors.text}
            icon="chevron-back"
            onPress={() => router.back()}
          />
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.accentForeground }]}>
              MAKANMANA
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {isPrivacy ? 'Privacy notice' : 'Terms of use'}
            </Text>
          </View>
        </View>

        {isPrivacy ? (
          <>
            <Section
              body="When you choose Use GPS or build a route, MakanMana collects your precise foreground location and sends it through our Supabase service to Google Maps Platform. Google returns nearby restaurants or a driving route."
              title="Location and Google"
            />
            <Section
              body="We do not store precise GPS coordinates in your account or request background location. Google responses are not cached. Security rate-limit identifiers are deleted after they become older than 24 hours when the service next processes a request."
              title="Storage and retention"
            />
            <Section
              body="Guest discovery creates a random anonymous Supabase account and session on your device so the protected search service can identify requests. It contains no email and is not treated as a signed-in MakanMana profile. Production cleanup must remove anonymous accounts after the published retention period."
              title="Guest session"
            />
            <Section
              body="When you open a sponsored restaurant, MakanMana records the promotion and your signed-in or anonymous account identifier once for that campaign. This measures unique profile viewers. Your precise GPS coordinates are not stored with the promotion event, and promotion events are deleted after 90 days."
              title="Sponsored restaurant measurement"
            />
            <Section
              body="You can deny location and search by area. You can revoke permission at any time in iPhone or Android Settings. Saved places are stored only after sign-in and can be removed from the app."
              title="Your choices"
            />
          </>
        ) : (
          <>
            <Section
              body="MakanMana helps you discover restaurants. Restaurant names, ratings, hours, addresses, routes, and availability can change; confirm important details with the venue."
              title="Service scope"
            />
            <Section
              body="Google Maps content is provided under Google's terms. Do not scrape, bulk-download, resell, or misuse map and place information."
              title="Google Maps content"
            />
            <Section
              body="Verified Halal labels appear only when a current trusted verification record is available. Missing verification is never a Halal claim."
              title="Halal information"
            />
            <Section
              body="Paid restaurant placements are always marked Sponsored. Payment can affect result placement during an active campaign, but it never creates or changes a Halal verification."
              title="Sponsored placements"
            />
          </>
        )}

        <View style={[styles.links, { borderColor: colors.border }]}>
          <LegalLink
            label="Google Privacy Policy"
            onPress={() => void Linking.openURL(GOOGLE_PRIVACY_URL)}
          />
          <LegalLink
            label="Google Maps Terms"
            onPress={() => void Linking.openURL(GOOGLE_TERMS_URL)}
          />
        </View>

        <Text style={[styles.updated, { color: colors.textMuted }]}>
          English MVP notice · Updated 27 July 2026
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ body, title }: { body: string; title: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
    </View>
  );
}

function LegalLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={styles.link}>
      <Text style={[styles.linkText, { color: colors.accentForeground }]}>
        {label}
      </Text>
      <Ionicons color={colors.accentForeground} name="open-outline" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: { fontFamily: fontFamily.display, fontSize: 34, marginTop: 2 },
  section: { gap: spacing.sm },
  sectionTitle: { fontFamily: fontFamily.display, fontSize: 21 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 23 },
  links: { borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.lg },
  link: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  linkText: { fontFamily: fontFamily.semibold, fontSize: 15 },
  updated: { fontFamily: fontFamily.regular, fontSize: 12 },
});
