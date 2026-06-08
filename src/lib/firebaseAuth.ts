import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithRedirect,
  updateProfile,
  type ConfirmationResult,
  type User,
} from 'firebase/auth'

export type FirebaseAuthProfile = {
  authProvider: 'google' | 'password' | 'phone'
  id: string
  joinedAt: string
  name: string
  phone: string
  username: string
}

export type PhoneOtpConfirmation = ConfirmationResult

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
}

let recaptchaVerifier: RecaptchaVerifier | null = null

export function isFirebaseAuthConfigured() {
  if (import.meta.env.MODE === 'test') {
    return false
  }

  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.appId &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId,
  )
}

export async function signInWithFirebaseGoogle() {
  const auth = getConfiguredAuth()
  const provider = new GoogleAuthProvider()
  provider.addScope('profile')
  provider.addScope('email')

  await signInWithRedirect(auth, provider)

  return null
}

export async function getFirebaseRedirectProfile() {
  const auth = getConfiguredAuth()
  const result = await getRedirectResult(auth)

  if (!result) {
    return null
  }

  return mapFirebaseUser(result.user, 'google')
}

export async function signInWithFirebasePassword(
  username: string,
  password: string,
) {
  const auth = getConfiguredAuth()
  const result = await signInWithEmailAndPassword(
    auth,
    getFirebaseEmail(username),
    password,
  )

  return mapFirebaseUser(result.user, 'password', username)
}

export async function signUpWithFirebasePassword({
  name,
  password,
  username,
}: {
  name: string
  password: string
  username: string
}) {
  const auth = getConfiguredAuth()
  const result = await createUserWithEmailAndPassword(
    auth,
    getFirebaseEmail(username),
    password,
  )

  await updateProfile(result.user, { displayName: name })

  return mapFirebaseUser(result.user, 'password', username, name)
}

export async function requestFirebasePhoneOtp(
  phone: string,
  recaptchaContainerId: string,
) {
  const auth = getConfiguredAuth()

  recaptchaVerifier?.clear()
  recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
    size: 'invisible',
  })

  return signInWithPhoneNumber(auth, phone, recaptchaVerifier)
}

export async function confirmFirebasePhoneOtp(
  confirmation: PhoneOtpConfirmation,
  code: string,
) {
  const result = await confirmation.confirm(code)

  return mapFirebaseUser(result.user, 'phone')
}

export function getFirebaseEmail(username: string) {
  const normalizedUsername = username.trim().toLowerCase()

  if (normalizedUsername.includes('@')) {
    return normalizedUsername
  }

  return `${normalizedUsername}@makanmana.local`
}

export function getFirebaseAuthErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : ''

  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase Authentication settings.'
  }

  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled in Firebase Authentication.'
  }

  if (code === 'auth/invalid-phone-number') {
    return 'Use a valid phone number with country code, for example +60123456789.'
  }

  if (code === 'auth/missing-app-credential' || code === 'auth/invalid-app-credential') {
    return 'Phone OTP reCAPTCHA failed. Check Firebase Phone Auth and authorized domains.'
  }

  if (code === 'auth/quota-exceeded') {
    return 'Firebase SMS quota was exceeded. Use Firebase test phone numbers while developing.'
  }

  if (code === 'auth/invalid-verification-code') {
    return 'OTP is incorrect.'
  }

  if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
    return 'Google login popup was blocked or closed. Try again.'
  }

  if (code === 'auth/email-already-in-use') {
    return 'This username is already used.'
  }

  if (code === 'auth/weak-password') {
    return 'Password is too weak.'
  }

  if (code === 'auth/invalid-credential') {
    return 'Username or password is incorrect.'
  }

  return 'Firebase authentication failed. Check Firebase Console setup.'
}

function getConfiguredAuth() {
  if (!isFirebaseAuthConfigured()) {
    throw new Error('Firebase auth is not configured')
  }

  const app = getApps()[0] ?? initializeApp(firebaseConfig)

  return getAuth(app)
}

function mapFirebaseUser(
  user: User,
  authProvider: FirebaseAuthProfile['authProvider'],
  username = user.email?.split('@')[0] ?? user.phoneNumber ?? user.uid,
  displayName = user.displayName ?? username,
): FirebaseAuthProfile {
  return {
    authProvider,
    id: user.uid,
    joinedAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).toISOString()
      : new Date().toISOString(),
    name: displayName,
    phone: user.phoneNumber ?? '',
    username,
  }
}
