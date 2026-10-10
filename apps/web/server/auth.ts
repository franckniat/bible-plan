import "server-only"

import { after } from "next/server"

import { createAuth } from "@workspace/auth"

import { getEmailSender } from "@/server/email"

/** better-auth server of the app; authentication emails go out after the response. */
export const auth = createAuth({
  emailSender: getEmailSender(),
  runAfterResponse: (task) => after(task),
})
