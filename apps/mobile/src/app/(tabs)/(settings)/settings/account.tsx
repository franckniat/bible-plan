import { getAuthErrorKey, type AuthErrorKey } from "@workspace/core"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { CircleAlert, KeyRound, Mail, MailCheck } from "lucide-react-native"
import { useState } from "react"
import { View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { KeyboardAction } from "@/components/ui/keyboard-action"
import { Notice } from "@/components/ui/notice"
import { Segmented } from "@/components/ui/segmented"
import { authClient, signInLinkPath } from "@/lib/auth-client"
import { siteUrl } from "@/lib/site"
import { spacing } from "@/theme/metrics"

/** The bar of the main action above the keyboard (KeyboardAction). */
const keyboardAction = "account"

type Mode = "signIn" | "signUp"

/** How to sign in: a password, or a link sent by email (no password). */
type Method = "password" | "magicLink"

/**
 * Signing up or in, never required: the account only saves and syncs what
 * is on the phone. Signing in takes a password or a link sent by email,
 * which opens the app back signed in (settings/sign-in-link). A new account
 * confirms its address by the link of an email (on the website).
 */
export default function AccountScreen() {
  const t = useTranslations("Auth")
  const tMobile = useTranslations("Mobile.account")
  const locale = useLocale()
  /** `invalid` when an email's sign-in link came back refused. */
  const { link } = useLocalSearchParams<{ link?: string }>()
  const [mode, setMode] = useState<Mode>("signIn")
  const [method, setMethod] = useState<Method>(
    link === "invalid" ? "magicLink" : "password"
  )
  /** The address a sign-in link was just sent to. */
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null)
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
  const usesLink = mode === "signIn" && method === "magicLink"
  const canSubmit = Boolean(email.trim()) && (usesLink || Boolean(password))
  const submitTitle = usesLink
    ? t("magicLink.submit")
    : t(mode === "signUp" ? "signUp.submit" : "signIn.submit")

  const submit = async () => {
    setError(null)
    setPending(true)
    const address = email.trim()
    try {
      if (usesLink) {
        const { error } = await authClient.signIn.magicLink({
          email: address,
          callbackURL: signInLinkPath,
          errorCallbackURL: signInLinkPath,
        })
        if (error) setError(getAuthErrorKey(error))
        else setLinkSentTo(address)
      } else if (mode === "signUp") {
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
        {linkSentTo ? (
          <Notice icon={MailCheck}>{t("magicLink.sent")}</Notice>
        ) : null}
        {link === "invalid" && !linkSentTo ? (
          <Notice icon={CircleAlert}>{t("magicLink.error")}</Notice>
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
            setLinkSentTo(null)
          }}
        />
        <View style={{ gap: spacing.md }}>
          {mode === "signUp" ? (
            <Input
              inputAccessoryViewID={keyboardAction}
              label={t("fields.name")}
              placeholder={t("fields.namePlaceholder")}
              value={name}
              onChangeText={setName}
              autoComplete="given-name"
              textContentType="givenName"
            />
          ) : null}
          <Input
            inputAccessoryViewID={keyboardAction}
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
          {usesLink ? <Body>{t("magicLink.description")}</Body> : null}
          {usesLink ? null : (
            <Input
              inputAccessoryViewID={keyboardAction}
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
          )}
          {mode === "signUp" ? <Body>{t("fields.passwordHint")}</Body> : null}
          <Button
            title={submitTitle}
            loading={pending}
            disabled={pending || !canSubmit}
            onPress={() => void submit()}
          />
          {mode === "signIn" ? (
            <Button
              title={t(
                usesLink
                  ? "magicLink.switchToPassword"
                  : "magicLink.switchToMagicLink"
              )}
              icon={usesLink ? KeyRound : Mail}
              variant="ghost"
              onPress={() => {
                setMethod(usesLink ? "password" : "magicLink")
                setError(null)
                setLinkSentTo(null)
              }}
            />
          ) : null}
        </View>
      </TabScreen>
      <KeyboardAction
        id={keyboardAction}
        title={submitTitle}
        loading={pending}
        disabled={pending || !canSubmit}
        onPress={() => void submit()}
      />
    </>
  )
}
