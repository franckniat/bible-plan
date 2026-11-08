import { getAuthErrorKey, type AuthErrorKey } from "@workspace/core"
import { router, Stack } from "expo-router"
import { CircleAlert, MailCheck } from "lucide-react-native"
import { useState } from "react"
import { View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { Segmented } from "@/components/ui/segmented"
import { authClient } from "@/lib/auth-client"
import { siteUrl } from "@/lib/site"
import { spacing } from "@/theme/metrics"

type Mode = "signIn" | "signUp"

/**
 * Signing up or in with an email and a password, never required: the
 * account only saves and syncs what is on the phone. A new account
 * confirms its address by the link of an email (on the website).
 */
export default function AccountScreen() {
  const t = useTranslations("Auth")
  const tMobile = useTranslations("Mobile.account")
  const locale = useLocale()
  const [mode, setMode] = useState<Mode>("signIn")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AuthErrorKey | null>(null)
  /** The address to confirm: after a sign-up, or a sign-in refused for it. */
  const [toConfirm, setToConfirm] = useState<{
    email: string
    signedUp: boolean
  } | null>(null)
  const [resent, setResent] = useState(false)
  const callbackURL = `${siteUrl}/${locale}/verify-email`

  const submit = async () => {
    setError(null)
    setPending(true)
    const address = email.trim()
    try {
      if (mode === "signUp") {
        const { error } = await authClient.signUp.email({
          name: name.trim(),
          email: address,
          password,
          callbackURL,
        })
        if (error) setError(getAuthErrorKey(error))
        else setToConfirm({ email: address, signedUp: true })
      } else {
        const { error } = await authClient.signIn.email({
          email: address,
          password,
        })
        if (error?.code === "EMAIL_NOT_VERIFIED") {
          setToConfirm({ email: address, signedUp: false })
        } else if (error) {
          setError(getAuthErrorKey(error))
        } else {
          router.back()
        }
      }
    } catch {
      setError("unexpected")
    } finally {
      setPending(false)
    }
  }

  const resend = async () => {
    if (!toConfirm) return
    const { error } = await authClient.sendVerificationEmail({
      email: toConfirm.email,
      callbackURL,
    })
    if (error) setError(getAuthErrorKey(error))
    else setResent(true)
  }

  return (
    <>
      <Stack.Screen options={{ title: tMobile("title") }} />
      <TabScreen>
        <Body>{tMobile("description")}</Body>
        {toConfirm ? (
          <Notice
            icon={MailCheck}
            actions={
              <Button
                title={t(resent ? "checkInbox.resent" : "checkInbox.resend")}
                variant="outline"
                size="sm"
                disabled={resent}
                onPress={() => void resend()}
              />
            }
          >
            {toConfirm.signedUp
              ? t("checkInbox.description", { email: toConfirm.email })
              : t("notVerified.message")}
          </Notice>
        ) : null}
        {error ? (
          <Notice icon={CircleAlert}>{t(`errors.${error}`)}</Notice>
        ) : null}
        <Segmented
          value={mode}
          options={[
            { value: "signIn", label: t("signIn.submit") },
            { value: "signUp", label: t("signUp.title") },
          ]}
          onChange={(next) => {
            setMode(next)
            setError(null)
          }}
        />
        <View style={{ gap: spacing.md }}>
          {mode === "signUp" ? (
            <Input
              label={t("fields.name")}
              placeholder={t("fields.namePlaceholder")}
              value={name}
              onChangeText={setName}
              autoComplete="given-name"
              textContentType="givenName"
            />
          ) : null}
          <Input
            label={t("fields.email")}
            placeholder={t("fields.emailPlaceholder")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Input
            label={t("fields.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={
              mode === "signUp" ? "new-password" : "current-password"
            }
            textContentType={mode === "signUp" ? "newPassword" : "password"}
            onSubmitEditing={() => void submit()}
          />
          {mode === "signUp" ? <Body>{t("fields.passwordHint")}</Body> : null}
          <Button
            title={t(mode === "signUp" ? "signUp.submit" : "signIn.submit")}
            loading={pending}
            disabled={pending || !email.trim() || !password}
            onPress={() => void submit()}
          />
        </View>
      </TabScreen>
    </>
  )
}
