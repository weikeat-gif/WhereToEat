import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import {
  Bell,
  Bookmark,
  CalendarDays,
  ChevronDown,
  Clock3,
  Compass,
  Copy,
  CreditCard,
  Edit3,
  Filter,
  Heart,
  History,
  KeyRound,
  Lock,
  LogOut,
  LocateFixed,
  Mail,
  MapPin,
  Navigation,
  Plus,
  Search,
  Share2,
  Star,
  Phone,
  Trophy,
  Utensils,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { toast, Toaster } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  buildGoogleMapsSearchUrl,
  type Coordinates,
  type LocationPermissionState,
} from '@/lib/maps'
import {
  buildGoogleMapsRestaurantUrl,
  fetchNearbyRestaurants,
  filterRestaurants,
  sampleRestaurants,
  type Restaurant,
} from '@/lib/restaurants'
import type {
  FirebaseAuthProfile,
  PhoneOtpConfirmation,
} from '@/lib/firebaseAuth'

const preferenceKey = 'makanmana.preferences'
const dietaryPreferencesKey = 'makanmana.dietary-preferences'
const savedRestaurantsKey = 'makanmana.saved-restaurants'
const authUserKey = 'makanmana.auth-user'
const authUsersKey = 'makanmana.auth-users'
const demoOtpCode = '123456'

type Preferences = {
  radiusKm: number
  priceLevel: '$' | '$$' | '$$$' | '$$$$'
  halalOnly: boolean
  groupFriendly: boolean
}

type AuthUser = {
  id: string
  name: string
  username: string
  phone: string
  joinedAt: string
  authProvider: 'google' | 'password' | 'phone'
}

type StoredAuthUser = AuthUser & {
  password?: string
}

type AuthSignUpDetails = {
  otp: string
  password: string
  phone: string
  username: string
}

type GoogleAccountDetails = {
  password: string
  phone: string
  username: string
}

const radiusOptions = [1, 3, 5, 10, 20] as const
const priceLevels = ['$', '$$', '$$$', '$$$$'] as const

const defaultPreferences: Preferences = {
  radiusKm: 3,
  priceLevel: '$$',
  halalOnly: false,
  groupFriendly: true,
}

type ActiveView = 'discover' | 'search' | 'saved' | 'activity' | 'profile' | 'settings'
type SortOption = 'nearest' | 'cheapest' | 'rating' | 'group'

const categories = [
  { label: 'Open Now', query: '' },
  { label: 'Halal', query: 'halal' },
  { label: 'Cafe', query: 'cafe' },
  { label: 'Cheap Eats', query: 'cheap' },
  { label: 'Group Friendly', query: 'group' },
  { label: 'Dessert', query: 'dessert' },
  { label: 'Late Night', query: 'late night' },
] as const

const cuisineFilters = ['Malay', 'Chinese', 'Indian', 'Western', 'Japanese', 'Korean', 'Thai']
const sortOptions: Array<{ label: string; value: SortOption }> = [
  { label: 'Nearest', value: 'nearest' },
  { label: 'Cheapest', value: 'cheapest' },
  { label: 'Top rated', value: 'rating' },
  { label: 'Group', value: 'group' },
]

function readPreferences(): Preferences {
  try {
    const stored = window.localStorage.getItem(preferenceKey)
    if (!stored) {
      return defaultPreferences
    }

    const parsed = JSON.parse(stored) as Partial<Preferences>

    return {
      radiusKm:
        typeof parsed.radiusKm === 'number'
          ? Math.min(20, Math.max(1, Math.round(parsed.radiusKm)))
          : defaultPreferences.radiusKm,
      priceLevel: parsed.priceLevel ?? defaultPreferences.priceLevel,
      halalOnly: parsed.halalOnly ?? defaultPreferences.halalOnly,
      groupFriendly: parsed.groupFriendly ?? defaultPreferences.groupFriendly,
    }
  } catch {
    return defaultPreferences
  }
}

function readSavedRestaurants(): Restaurant[] {
  try {
    const stored = window.localStorage.getItem(savedRestaurantsKey)

    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isStoredRestaurant).slice(0, 30)
  } catch {
    return []
  }
}

function readAuthenticatedUser(): AuthUser | null {
  try {
    const stored = window.localStorage.getItem(authUserKey)

    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored)

    if (!isAuthUser(parsed)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function readAuthUsers(): StoredAuthUser[] {
  try {
    const stored = window.localStorage.getItem(authUsersKey)

    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isStoredAuthUser)
  } catch {
    return []
  }
}

function saveAuthUsers(users: StoredAuthUser[]) {
  window.localStorage.setItem(authUsersKey, JSON.stringify(users))
}

function saveAuthenticatedUser(user: AuthUser) {
  window.localStorage.setItem(authUserKey, JSON.stringify(user))
}

function createAuthUser({
  authProvider,
  name,
  password,
  phone,
  username,
}: {
  authProvider: AuthUser['authProvider']
  name: string
  password?: string
  phone: string
  username: string
}): StoredAuthUser {
  return {
    id: `user-${Date.now()}`,
    name,
    username,
    phone,
    joinedAt: new Date().toISOString(),
    authProvider,
    password,
  }
}

function readDietaryPreferences() {
  try {
    const stored = window.localStorage.getItem(dietaryPreferencesKey)

    if (!stored) {
      return ['Halal', 'Vegetarian']
    }

    const parsed = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      return ['Halal', 'Vegetarian']
    }

    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return ['Halal', 'Vegetarian']
  }
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'username' in value &&
    'phone' in value &&
    'joinedAt' in value
  )
}

function isStoredAuthUser(value: unknown): value is StoredAuthUser {
  return isAuthUser(value)
}

function getPublicAuthUser(user: StoredAuthUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    phone: user.phone,
    joinedAt: user.joinedAt,
    authProvider: user.authProvider,
  }
}

function getAuthUserFromFirebase(profile: FirebaseAuthProfile): AuthUser {
  return {
    id: profile.id,
    name: profile.username,
    username: profile.username,
    phone: profile.phone,
    joinedAt: profile.joinedAt,
    authProvider: profile.authProvider,
  }
}

function saveCompletedGoogleUser(user: AuthUser, password?: string) {
  const users = readAuthUsers()
  const storedUser: StoredAuthUser = password ? { ...user, password } : user
  const otherUsers = users.filter((currentUser) => currentUser.id !== user.id)

  saveAuthUsers([storedUser, ...otherUsers])
}

function formatJoinedDate(joinedAt: string) {
  const date = new Date(joinedAt)

  if (Number.isNaN(date.getTime())) {
    return 'Joined recently'
  }

  return `Joined ${date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`
}

function isStoredRestaurant(value: unknown): value is Restaurant {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'lat' in value &&
    'lng' in value
  )
}

function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(() =>
    readAuthenticatedUser(),
  )
  const [preferences, setPreferences] = useState<Preferences>(() => readPreferences())
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(() =>
    readDietaryPreferences(),
  )
  const [savedRestaurants, setSavedRestaurants] = useState<Restaurant[]>(() =>
    readSavedRestaurants(),
  )
  const [activeView, setActiveView] = useState<ActiveView>('discover')
  const [foodQuery, setFoodQuery] = useState('')
  const [hasSearchSubmitted, setHasSearchSubmitted] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Open Now')
  const [sortOption, setSortOption] = useState<SortOption>('nearest')
  const [manualLocation, setManualLocation] = useState('')
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>('idle')
  const [restaurants, setRestaurants] = useState<Restaurant[]>(sampleRestaurants)
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false)
  const [phoneOtpConfirmation, setPhoneOtpConfirmation] =
    useState<PhoneOtpConfirmation | null>(null)
  const [pendingGoogleUser, setPendingGoogleUser] = useState<AuthUser | null>(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(
    null,
  )

  useEffect(() => {
    window.localStorage.setItem(preferenceKey, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    window.localStorage.setItem(
      dietaryPreferencesKey,
      JSON.stringify(dietaryPreferences),
    )
  }, [dietaryPreferences])

  useEffect(() => {
    window.localStorage.setItem(
      savedRestaurantsKey,
      JSON.stringify(savedRestaurants),
    )
  }, [savedRestaurants])

  useEffect(() => {
    if (authenticatedUser) {
      return
    }

    async function completeFirebaseRedirectSignIn() {
      const firebaseAuth = await import('@/lib/firebaseAuth')

      if (!firebaseAuth.isFirebaseAuthConfigured()) {
        return
      }

      try {
        const profile = await firebaseAuth.getFirebaseRedirectProfile()

        if (profile) {
          const existingUser = readAuthUsers().find(
            (user) => user.authProvider === 'google' && user.id === profile.id,
          )

          if (existingUser) {
            completeAuth(existingUser)
            return
          }

          setPendingGoogleUser(getAuthUserFromFirebase(profile))
        }
      } catch (error) {
        toast.error(firebaseAuth.getFirebaseAuthErrorMessage(error))
      }
    }

    void completeFirebaseRedirectSignIn()
  }, [authenticatedUser])

  const visibleRestaurants = useMemo(
    () =>
      prioritizeRestaurantsByPreferences(
        sortRestaurants(filterRestaurants(restaurants, foodQuery), sortOption),
        dietaryPreferences,
      ),
    [dietaryPreferences, foodQuery, restaurants, sortOption],
  )

  const recommendedRestaurants = visibleRestaurants.slice(0, 4)
  const popularRestaurants = visibleRestaurants.slice(0, 6)
  const savedRestaurantIds = useMemo(
    () => new Set(savedRestaurants.map((restaurant) => restaurant.id)),
    [savedRestaurants],
  )
  const hasResults = visibleRestaurants.length > 0

  const quickMapsUrl = useMemo(
    () =>
      buildGoogleMapsSearchUrl({
        intent: 'open-nearby',
        coordinates: userLocation,
        manualLocation,
        radiusKm: preferences.radiusKm,
      }),
    [manualLocation, preferences.radiusKm, userLocation],
  )

  const statusLabel = {
    idle: 'Ready',
    requesting: 'Locating',
    granted: 'GPS ready',
    denied: 'Type location',
    unavailable: 'Type location',
  }[permissionState]

  function updatePreferences(nextPreferences: Partial<Preferences>) {
    setPreferences((current) => ({ ...current, ...nextPreferences }))
  }

  function completeAuth(user: StoredAuthUser | AuthUser | FirebaseAuthProfile) {
    if ('authProvider' in user && !('password' in user) && 'id' in user) {
      const firebaseUser = getAuthUserFromFirebase(user as FirebaseAuthProfile)
      saveAuthenticatedUser(firebaseUser)
      setAuthenticatedUser(firebaseUser)
      setPendingGoogleUser(null)
      toast.success(`Welcome, ${firebaseUser.username}`)
      return
    }

    const publicUser = 'password' in user ? getPublicAuthUser(user) : user
    saveAuthenticatedUser(publicUser)
    setAuthenticatedUser(publicUser)
    setPendingGoogleUser(null)
    toast.success(`Welcome, ${publicUser.username}`)
  }

  async function signInWithGoogle() {
    const firebaseAuth = await import('@/lib/firebaseAuth')

    if (firebaseAuth.isFirebaseAuthConfigured()) {
      try {
        const profile = await firebaseAuth.signInWithFirebaseGoogle()

        if (profile) {
          completeAuth(profile)
        }
        return
      } catch (error) {
        toast.error(firebaseAuth.getFirebaseAuthErrorMessage(error))
        return
      }
    }

    const users = readAuthUsers()
    const existingUser = users.find((user) => user.authProvider === 'google')

    if (existingUser) {
      completeAuth(existingUser)
      return
    }

    const googleUser = createAuthUser({
      authProvider: 'google',
      name: '',
      username: '',
      phone: '',
    })

    setPendingGoogleUser(getPublicAuthUser(googleUser))
  }

  async function signInWithPassword(username: string, password: string) {
    const firebaseAuth = await import('@/lib/firebaseAuth')

    if (firebaseAuth.isFirebaseAuthConfigured()) {
      try {
        completeAuth(
          await firebaseAuth.signInWithFirebasePassword(username, password),
        )
        return
      } catch (error) {
        toast.error(firebaseAuth.getFirebaseAuthErrorMessage(error))
        return
      }
    }

    const users = readAuthUsers()
    const normalizedUsername = username.trim().toLowerCase()
    const user = users.find(
      (storedUser) =>
        storedUser.username.toLowerCase() === normalizedUsername &&
        storedUser.password === password,
    )

    if (!user) {
      toast.error('Username or password is incorrect')
      return
    }

    completeAuth(user)
  }

  async function requestPhoneOtp(phone: string) {
    if (!phone.trim()) {
      toast.error('Enter your phone number first')
      return false
    }

    const firebaseAuth = await import('@/lib/firebaseAuth')

    if (firebaseAuth.isFirebaseAuthConfigured()) {
      try {
        const confirmation = await firebaseAuth.requestFirebasePhoneOtp(
          phone.trim(),
          'auth-recaptcha-container',
        )
        setPhoneOtpConfirmation(confirmation)
        toast.success('OTP sent')
        return true
      } catch (error) {
        toast.error(firebaseAuth.getFirebaseAuthErrorMessage(error))
        return false
      }
    }

    toast.success(`Demo OTP sent: ${demoOtpCode}`)
    return true
  }

  async function signInWithPhone(phone: string, otp: string) {
    const firebaseAuth = await import('@/lib/firebaseAuth')

    if (firebaseAuth.isFirebaseAuthConfigured()) {
      if (!phoneOtpConfirmation) {
        toast.error('Request OTP first')
        return
      }

      try {
        completeAuth(
          await firebaseAuth.confirmFirebasePhoneOtp(phoneOtpConfirmation, otp),
        )
        setPhoneOtpConfirmation(null)
        return
      } catch (error) {
        toast.error(firebaseAuth.getFirebaseAuthErrorMessage(error))
        return
      }
    }

    if (otp !== demoOtpCode) {
      toast.error('OTP is incorrect')
      return
    }

    const normalizedPhone = phone.trim()
    const users = readAuthUsers()
    const user = users.find((storedUser) => storedUser.phone === normalizedPhone)

    if (!user) {
      const phoneUser = createAuthUser({
        authProvider: 'phone',
        name: `User ${normalizedPhone.slice(-4) || 'Phone'}`,
        username: normalizedPhone || 'phone-user',
        phone: normalizedPhone,
      })
      saveAuthUsers([phoneUser, ...users])
      completeAuth(phoneUser)
      return
    }

    completeAuth(user)
  }

  async function completeGoogleAccount({
    password,
    phone,
    username,
  }: GoogleAccountDetails) {
    if (!pendingGoogleUser) {
      toast.error('Start Google sign up first')
      return
    }

    const firebaseAuth = await import('@/lib/firebaseAuth')
    const normalizedUsername = username.trim()

    if (firebaseAuth.isFirebaseAuthConfigured()) {
      try {
        const firebaseProfile = await firebaseAuth.completeFirebaseGoogleAccount({
          password,
          phone,
          username: normalizedUsername,
        })
        const completedUser = getAuthUserFromFirebase(firebaseProfile)

        saveCompletedGoogleUser(completedUser)
        completeAuth(completedUser)
        return
      } catch (error) {
        toast.error(firebaseAuth.getFirebaseAuthErrorMessage(error))
        return
      }
    }

    const users = readAuthUsers()

    if (
      users.some(
        (storedUser) =>
          storedUser.username.toLowerCase() === normalizedUsername.toLowerCase(),
      )
    ) {
      toast.error('This username is already used')
      return
    }

    const completedUser: AuthUser = {
      ...pendingGoogleUser,
      name: normalizedUsername,
      username: normalizedUsername,
      phone: phone.trim(),
    }

    saveCompletedGoogleUser(completedUser, password)
    completeAuth(completedUser)
  }

  async function signUpWithPassword({
    otp,
    password,
    phone,
    username,
  }: AuthSignUpDetails) {
    const firebaseAuth = await import('@/lib/firebaseAuth')

    if (firebaseAuth.isFirebaseAuthConfigured()) {
      if (!phoneOtpConfirmation) {
        toast.error('Request OTP before creating account')
        return
      }

      try {
        await firebaseAuth.confirmFirebasePhoneOtp(phoneOtpConfirmation, otp)
        completeAuth(
          await firebaseAuth.signUpWithFirebasePassword({
            password,
            username: username.trim(),
          }),
        )
        setPhoneOtpConfirmation(null)
        return
      } catch (error) {
        toast.error(firebaseAuth.getFirebaseAuthErrorMessage(error))
        return
      }
    }

    if (otp !== demoOtpCode) {
      toast.error('OTP is incorrect')
      return
    }

    const users = readAuthUsers()
    const normalizedUsername = username.trim().toLowerCase()

    if (
      users.some((storedUser) => storedUser.username.toLowerCase() === normalizedUsername)
    ) {
      toast.error('This username is already used')
      return
    }

    const newUser = createAuthUser({
      authProvider: 'password',
      name: username.trim(),
      username: username.trim(),
      phone: phone.trim(),
      password,
    })

    saveAuthUsers([newUser, ...users])
    completeAuth(newUser)
  }

  function logOut() {
    window.localStorage.removeItem(authUserKey)
    setPhoneOtpConfirmation(null)
    setAuthenticatedUser(null)
    setActiveView('discover')
    toast.success('Logged out')
  }

  function addDietaryPreference(preference: string) {
    const normalizedPreference = preference.trim()

    if (!normalizedPreference) {
      return
    }

    setDietaryPreferences((current) =>
      current.some(
        (item) => item.toLowerCase() === normalizedPreference.toLowerCase(),
      )
        ? current
        : [...current, normalizedPreference],
    )
  }

  function removeDietaryPreference(preference: string) {
    setDietaryPreferences((current) =>
      current.filter((item) => item !== preference),
    )
  }

  function selectCategory(category: (typeof categories)[number]) {
    setActiveCategory(category.label)
    setFoodQuery(category.query)
    setManualLocation('')
    setHasSearchSubmitted(false)
  }

  function selectCuisine(cuisine: string) {
    setActiveCategory(cuisine)
    setFoodQuery(cuisine.toLowerCase())
    setManualLocation('')
    setHasSearchSubmitted(false)
  }

  function updateFoodQuery(value: string) {
    setFoodQuery(value)
    setActiveCategory('')
    setManualLocation('')
    setHasSearchSubmitted(false)
  }

  function clearSearch() {
    setFoodQuery('')
    setActiveCategory('Open Now')
    setManualLocation('')
    setHasSearchSubmitted(false)
  }

  function increaseRadiusForResults() {
    updatePreferences({ radiusKm: Math.min(20, preferences.radiusKm + 5) })
    toast.info('Distance increased')
  }

  function toggleSavedRestaurant(restaurant: Restaurant) {
    const willSave = !savedRestaurantIds.has(restaurant.id)

    setSavedRestaurants((current) => {
      if (current.some((savedRestaurant) => savedRestaurant.id === restaurant.id)) {
        return current.filter(
          (savedRestaurant) => savedRestaurant.id !== restaurant.id,
        )
      }

      return [
        restaurant,
        ...current.filter(
          (savedRestaurant) => savedRestaurant.id !== restaurant.id,
        ),
      ].slice(0, 30)
    })

    toast.success(willSave ? 'Saved to your food list' : 'Removed from saved')
  }

  async function loadRestaurantResults(coordinates: Coordinates | null) {
    setIsLoadingPlaces(true)

    try {
      if (!coordinates) {
        setRestaurants(sampleRestaurants)
        return
      }

      const nearbyRestaurants = await fetchNearbyRestaurants(
        coordinates,
        preferences.radiusKm,
      )

      setRestaurants(
        nearbyRestaurants.length > 0 ? nearbyRestaurants : sampleRestaurants,
      )
    } catch {
      setRestaurants(sampleRestaurants)
      toast.warning('Showing sample picks. Live nearby places did not load.')
    } finally {
      setIsLoadingPlaces(false)
    }
  }

  function searchNearbyFood(searchText = '') {
    setHasSearchSubmitted(true)

    const typedLocation = manualLocation.trim() || searchText.trim()

    if (typedLocation) {
      setManualLocation(typedLocation)
      setPermissionState((current) => (current === 'requesting' ? 'idle' : current))
      void loadRestaurantResults(null)
      return
    }

    if (!navigator.geolocation?.getCurrentPosition) {
      setPermissionState('unavailable')
      void loadRestaurantResults(null)
      return
    }

    setPermissionState('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        }
        setUserLocation(coordinates)
        setPermissionState('granted')
        void loadRestaurantResults(coordinates)
      },
      () => {
        setUserLocation(null)
        setPermissionState('denied')
        void loadRestaurantResults(null)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    )
  }

  function openRestaurantMaps(restaurant: Restaurant) {
    window.open(
      buildGoogleMapsRestaurantUrl(restaurant),
      '_blank',
      'noopener,noreferrer',
    )
  }

  async function copyRestaurantLink(restaurant: Restaurant) {
    await navigator.clipboard.writeText(buildGoogleMapsRestaurantUrl(restaurant))
    toast.success('Restaurant link copied')
  }

  async function shareRestaurant(restaurant: Restaurant) {
    const url = buildGoogleMapsRestaurantUrl(restaurant)
    const planText = [
      `Jom makan at ${restaurant.name}`,
      `Food: ${restaurant.menuHighlights.slice(0, 3).join(', ')}`,
      `Price: ${restaurant.price}`,
      `Why: ${restaurant.vibe}`,
    ].join('\n')

    if (navigator.share) {
      await navigator.share({
        title: restaurant.name,
        text: planText,
        url,
      })
      return
    }

    await navigator.clipboard.writeText(`${planText}\nMaps: ${url}`)
    toast.success('Food plan copied')
  }

  if (!authenticatedUser) {
    if (pendingGoogleUser) {
      return (
        <GoogleAccountSetupView
          onCancel={() => setPendingGoogleUser(null)}
          onComplete={completeGoogleAccount}
          pendingGoogleUser={pendingGoogleUser}
        />
      )
    }

    return (
      <AuthView
        onGoogleSignIn={signInWithGoogle}
        onPasswordSignIn={signInWithPassword}
        onRequestPhoneOtp={requestPhoneOtp}
        onPhoneSignIn={signInWithPhone}
        onSignUp={signUpWithPassword}
      />
    )
  }

  return (
    <main className="relative mx-auto min-h-svh w-full max-w-xl overflow-x-hidden bg-background pb-28 text-foreground shadow-[0_0_0_1px_rgba(190,200,202,0.35)]">
      <header className="sticky top-0 z-30 w-full overflow-hidden border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open discover"
            onClick={() => setActiveView('discover')}
          >
            <img src="/pwa-icon.svg" alt="" className="size-8" />
          </Button>
          <h1 className="truncate text-center text-3xl font-semibold text-primary">
            MakanMana
          </h1>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open search"
            onClick={() => setActiveView('search')}
          >
            <Search className="size-6" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {activeView === 'discover' ? (
        <>
      <section className="px-4 pt-4">
        <StatusControls
          activeCategory={activeCategory}
          isSearching={permissionState === 'requesting' || isLoadingPlaces}
          preferences={preferences}
          onFindNearby={() => searchNearbyFood()}
          onNearest={() => setSortOption('nearest')}
          onSelectCategory={selectCategory}
          onSelectCuisine={selectCuisine}
          onUpdatePreferences={updatePreferences}
        />
      </section>

      {!hasResults ? (
        <EmptyResults
          query={foodQuery}
          onClear={clearSearch}
          onIncreaseRadius={increaseRadiusForResults}
          onOpenMaps={() =>
            window.open(quickMapsUrl, '_blank', 'noopener,noreferrer')
          }
          onTryCafe={() =>
            selectCategory(categories.find((item) => item.label === 'Cafe') ?? categories[0])
          }
        />
      ) : null}

      {hasResults ? (
        <section className="mt-4 space-y-3 overflow-hidden pl-4">
        <SectionHeader title="Recommended Nearby" action="See All" />
        <DragScrollArea className="flex w-full max-w-full gap-4 overflow-x-auto pb-4 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isLoadingPlaces
            ? [1, 2].map((item) => <RecommendedSkeleton key={item} />)
            : recommendedRestaurants.map((restaurant) => (
                <RecommendedCard
                  key={restaurant.id}
                  isSaved={savedRestaurantIds.has(restaurant.id)}
                  restaurant={restaurant}
                  onOpenMaps={() => openRestaurantMaps(restaurant)}
                  onSelect={() => setSelectedRestaurant(restaurant)}
                  onShare={() => void shareRestaurant(restaurant)}
                  onToggleSaved={() => toggleSavedRestaurant(restaurant)}
                />
              ))}
        </DragScrollArea>
        </section>
      ) : null}

      {hasResults ? (
        <section className="mt-4 space-y-3 px-4">
        <SectionHeader title="Popular Around You" />
        <div className="grid gap-3">
          {popularRestaurants.map((restaurant) => (
            <PopularCard
              key={restaurant.id}
              isSaved={savedRestaurantIds.has(restaurant.id)}
              restaurant={restaurant}
              onOpenMaps={() => openRestaurantMaps(restaurant)}
              onSelect={() => setSelectedRestaurant(restaurant)}
              onShare={() => void shareRestaurant(restaurant)}
              onToggleSaved={() => toggleSavedRestaurant(restaurant)}
            />
          ))}
        </div>
        </section>
      ) : null}

      <section className="mt-6 px-4">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="size-5 text-primary" aria-hidden="true" />
              Quick Maps Search
            </CardTitle>
            <CardDescription>Food results on Google Maps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-lg bg-secondary p-3 text-xs leading-5 text-muted-foreground break-words">
              {quickMapsUrl}
            </p>
            <Button
              variant="outline"
              className="w-full rounded-lg"
              onClick={() => window.open(quickMapsUrl, '_blank', 'noopener,noreferrer')}
            >
              <Navigation className="size-4" aria-hidden="true" />
              Open broad Maps search
            </Button>
          </CardContent>
        </Card>
      </section>
        </>
      ) : null}

      {activeView === 'search' ? (
        <SearchView
          activeCategory={activeCategory}
          foodQuery={foodQuery}
          hasSearched={hasSearchSubmitted}
          isLoadingPlaces={isLoadingPlaces}
          permissionState={permissionState}
          restaurants={visibleRestaurants}
          savedRestaurantIds={savedRestaurantIds}
          sortOption={sortOption}
          statusLabel={statusLabel}
          onFoodQueryChange={updateFoodQuery}
          onOpenMaps={openRestaurantMaps}
          onSearchNearby={searchNearbyFood}
          onSelectCategory={selectCategory}
          onSelectRestaurant={setSelectedRestaurant}
          onSortChange={setSortOption}
          onShare={(restaurant) => void shareRestaurant(restaurant)}
          onToggleSaved={toggleSavedRestaurant}
        />
      ) : null}

      {activeView === 'saved' ? (
        <SavedView
          restaurants={savedRestaurants}
          onBrowse={() => setActiveView('discover')}
          onOpenMaps={openRestaurantMaps}
          onRemove={toggleSavedRestaurant}
          onSelectRestaurant={setSelectedRestaurant}
          onShare={(restaurant) => void shareRestaurant(restaurant)}
        />
      ) : null}

      {activeView === 'activity' ? (
        <ActivityView
          restaurants={popularRestaurants}
        />
      ) : null}

      {activeView === 'profile' ? (
        <ProfileView
          authenticatedUser={authenticatedUser}
          dietaryPreferences={dietaryPreferences}
          savedRestaurants={savedRestaurants}
          statusLabel={statusLabel}
          onAddPreference={addDietaryPreference}
          onBrowseFood={() => setActiveView('discover')}
          onOpenMaps={openRestaurantMaps}
          onLogOut={logOut}
          onRemovePreference={removeDietaryPreference}
          onRemoveSaved={toggleSavedRestaurant}
          onSelectRestaurant={setSelectedRestaurant}
          onShareRestaurant={(restaurant) => void shareRestaurant(restaurant)}
        />
      ) : null}

      {activeView === 'settings' ? (
        <SettingsView preferences={preferences} onUpdatePreferences={updatePreferences} />
      ) : null}

      <RestaurantDetailPopup
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
        isSaved={
          selectedRestaurant ? savedRestaurantIds.has(selectedRestaurant.id) : false
        }
        onOpenMaps={openRestaurantMaps}
        onCopy={(restaurant) => void copyRestaurantLink(restaurant)}
        onShare={(restaurant) => void shareRestaurant(restaurant)}
        onToggleSaved={(restaurant) => toggleSavedRestaurant(restaurant)}
      />

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl border-t border-border/70 bg-card/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-4 gap-2">
          <NavItem
            active={activeView === 'discover'}
            icon={<Compass className="size-6" />}
            label="Discover"
            onClick={() => setActiveView('discover')}
          />
          <NavItem
            active={activeView === 'search'}
            icon={<Search className="size-6" />}
            label="Search"
            onClick={() => setActiveView('search')}
          />
          <NavItem
            active={activeView === 'activity'}
            icon={<History className="size-6" />}
            label="Activity"
            onClick={() => setActiveView('activity')}
          />
          <NavItem
            active={activeView === 'profile'}
            icon={<UserRound className="size-6" />}
            label="Profile"
            onClick={() => setActiveView('profile')}
          />
        </div>
      </nav>

      <Toaster richColors position="bottom-center" />
    </main>
  )
}

function GoogleAccountSetupView({
  onCancel,
  onComplete,
  pendingGoogleUser,
}: {
  onCancel: () => void
  onComplete: (details: GoogleAccountDetails) => Promise<void> | void
  pendingGoogleUser: AuthUser
}) {
  const suggestedUsername =
    pendingGoogleUser.username && !pendingGoogleUser.username.includes('@')
      ? pendingGoogleUser.username
      : ''
  const [username, setUsername] = useState(suggestedUsername)
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState(pendingGoogleUser.phone)

  async function submitGoogleDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username.trim() || !password || !phone.trim()) {
      toast.error('Fill in username, password, and phone number')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    await onComplete({ password, phone, username })
  }

  return (
    <main className="relative mx-auto flex min-h-svh w-full max-w-xl flex-col bg-background px-4 py-6 text-foreground shadow-[0_0_0_1px_rgba(190,200,202,0.35)]">
      <div className="flex items-center gap-3">
        <img src="/pwa-icon.svg" alt="" className="size-11" />
        <div>
          <h1 className="text-3xl font-semibold text-primary">MakanMana</h1>
          <p className="text-sm text-muted-foreground">
            Finish your Google account setup.
          </p>
        </div>
      </div>

      <Card className="mt-6 rounded-xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Complete Google Sign Up</CardTitle>
          <CardDescription>
            Add your app username, password, and phone number before entering.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submitGoogleDetails}>
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="google-username">
                Username
              </label>
              <Input
                id="google-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="makanfan"
                className="h-12 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="google-password">
                Password
              </label>
              <Input
                id="google-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="minimum 6 characters"
                className="h-12 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="google-phone">
                Phone number
              </label>
              <Input
                id="google-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+60 12 345 6789"
                className="h-12 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-lg"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-12 rounded-lg">
                Enter App
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div id="auth-recaptcha-container" />
      <Toaster richColors position="bottom-center" />
    </main>
  )
}

function AuthView({
  onGoogleSignIn,
  onPasswordSignIn,
  onPhoneSignIn,
  onRequestPhoneOtp,
  onSignUp,
}: {
  onGoogleSignIn: () => Promise<void> | void
  onPasswordSignIn: (username: string, password: string) => Promise<void> | void
  onPhoneSignIn: (phone: string, otp: string) => Promise<void> | void
  onRequestPhoneOtp: (phone: string) => Promise<boolean>
  onSignUp: (details: AuthSignUpDetails) => Promise<void> | void
}) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginPhone, setLoginPhone] = useState('')
  const [loginOtp, setLoginOtp] = useState('')
  const [isLoginOtpSent, setIsLoginOtpSent] = useState(false)
  const [signupUsername, setSignupUsername] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupOtp, setSignupOtp] = useState('')
  const [isSignupOtpSent, setIsSignupOtpSent] = useState(false)

  async function requestLoginOtp() {
    setIsLoginOtpSent(await onRequestPhoneOtp(loginPhone))
  }

  async function requestSignupOtp() {
    setIsSignupOtpSent(await onRequestPhoneOtp(signupPhone))
  }

  async function submitPasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!loginUsername.trim() || !loginPassword) {
      toast.error('Enter username and password')
      return
    }

    await onPasswordSignIn(loginUsername, loginPassword)
  }

  async function submitPhoneLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isLoginOtpSent) {
      requestLoginOtp()
      return
    }

    await onPhoneSignIn(loginPhone, loginOtp)
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      !signupUsername.trim() ||
      !signupPassword ||
      !signupPhone.trim()
    ) {
      toast.error('Fill in all sign up details')
      return
    }

    if (!isSignupOtpSent) {
      toast.error('Request OTP before creating account')
      return
    }

    await onSignUp({
      otp: signupOtp,
      username: signupUsername,
      password: signupPassword,
      phone: signupPhone,
    })
  }

  return (
    <main className="relative mx-auto flex min-h-svh w-full max-w-xl flex-col bg-background px-4 py-6 text-foreground shadow-[0_0_0_1px_rgba(190,200,202,0.35)]">
      <div className="flex items-center gap-3">
        <img src="/pwa-icon.svg" alt="" className="size-11" />
        <div>
          <h1 className="text-3xl font-semibold text-primary">MakanMana</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to save food, vote, and keep your profile.
          </p>
        </div>
      </div>

      <Card className="mt-6 rounded-xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{authMode === 'login' ? 'Log in' : 'Sign up'}</CardTitle>
          <CardDescription>
            Use Google, username/password, or phone OTP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
            {(['login', 'signup'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAuthMode(mode)}
                className={`h-10 rounded-md text-sm font-semibold transition ${
                  authMode === mode
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                {mode === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <Button className="h-12 w-full rounded-lg" onClick={onGoogleSignIn}>
            <UserPlus className="size-5" aria-hidden="true" />
            Continue with Google
          </Button>

          {authMode === 'login' ? (
            <div className="space-y-4">
              <form className="space-y-3" onSubmit={submitPasswordLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold" htmlFor="login-username">
                    Username
                  </label>
                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="login-username"
                      value={loginUsername}
                      onChange={(event) => setLoginUsername(event.target.value)}
                      placeholder="your username"
                      className="h-12 rounded-lg pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold" htmlFor="login-password">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder="password"
                      className="h-12 rounded-lg pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" variant="outline" className="h-12 w-full rounded-lg">
                  <KeyRound className="size-5" aria-hidden="true" />
                  Log in with password
                </Button>
              </form>

              <form className="space-y-3 rounded-xl border bg-card p-3" onSubmit={submitPhoneLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold" htmlFor="login-phone">
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="login-phone"
                      value={loginPhone}
                      onChange={(event) => setLoginPhone(event.target.value)}
                      placeholder="+60 12 345 6789"
                      className="h-12 rounded-lg pl-10"
                    />
                  </div>
                </div>
                {isLoginOtpSent ? (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold" htmlFor="login-otp">
                      OTP
                    </label>
                    <Input
                      id="login-otp"
                      value={loginOtp}
                      onChange={(event) => setLoginOtp(event.target.value)}
                      placeholder={demoOtpCode}
                      className="h-12 rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Demo OTP: {demoOtpCode}
                    </p>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-lg"
                    onClick={requestLoginOtp}
                  >
                    Request OTP
                  </Button>
                  <Button type="submit" className="h-12 rounded-lg">
                    Verify
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={submitSignup}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold" htmlFor="signup-username">
                    Username
                  </label>
                  <Input
                    id="signup-username"
                    value={signupUsername}
                    onChange={(event) => setSignupUsername(event.target.value)}
                    placeholder="makanfan"
                    className="h-12 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold" htmlFor="signup-password">
                    Password
                  </label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    placeholder="password"
                    className="h-12 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="signup-phone">
                  Phone number
                </label>
                <Input
                  id="signup-phone"
                  value={signupPhone}
                  onChange={(event) => setSignupPhone(event.target.value)}
                  placeholder="+60 12 345 6789"
                  className="h-12 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-2">
                <Input
                  aria-label="Sign up OTP"
                  value={signupOtp}
                  onChange={(event) => setSignupOtp(event.target.value)}
                  placeholder={isSignupOtpSent ? demoOtpCode : 'OTP code'}
                  className="h-12 rounded-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-lg"
                  onClick={requestSignupOtp}
                >
                  Request OTP
                </Button>
              </div>
              {isSignupOtpSent ? (
                <p className="text-xs text-muted-foreground">
                  Demo OTP: {demoOtpCode}
                </p>
              ) : null}
              <Button type="submit" className="h-12 w-full rounded-lg">
                Create account
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 rounded-xl bg-secondary p-3 text-xs leading-5 text-muted-foreground">
        MVP note: Google and SMS OTP are demo flows in this version. Connect a
        real auth provider later for production security.
      </p>
      <div id="auth-recaptcha-container" />
      <Toaster richColors position="bottom-center" />
    </main>
  )
}

function StatusControls({
  activeCategory,
  isSearching,
  onFindNearby,
  onNearest,
  preferences,
  onSelectCategory,
  onSelectCuisine,
  onUpdatePreferences,
}: {
  activeCategory: string
  isSearching: boolean
  preferences: Preferences
  onFindNearby: () => void
  onNearest: () => void
  onSelectCategory: (category: (typeof categories)[number]) => void
  onSelectCuisine: (cuisine: string) => void
  onUpdatePreferences: (nextPreferences: Partial<Preferences>) => void
}) {
  const modeOptions = [
    ...categories.map((category) => category.label),
    ...cuisineFilters,
  ]
  const modeValue = modeOptions.includes(activeCategory) ? activeCategory : 'Custom'

  function handleModeChange(value: string) {
    const category = categories.find((item) => item.label === value)

    if (category) {
      onSelectCategory(category)
      return
    }

    if (cuisineFilters.includes(value)) {
      onSelectCuisine(value)
    }
  }

  const cheapCategory =
    categories.find((item) => item.label === 'Cheap Eats') ?? categories[0]
  const cafeCategory =
    categories.find((item) => item.label === 'Cafe') ?? categories[0]
  const lateNightCategory =
    categories.find((item) => item.label === 'Late Night') ?? categories[0]

  const quickModes = [
    {
      label: 'Nearest',
      action: onNearest,
    },
    {
      label: 'Cheap',
      action: () => onSelectCategory(cheapCategory),
    },
    {
      label: 'Cafe',
      action: () => onSelectCategory(cafeCategory),
    },
    {
      label: 'Late',
      action: () => onSelectCategory(lateNightCategory),
    },
  ]

  return (
    <div className="rounded-xl border border-border/70 bg-card p-2 text-center shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        <StatusSelect
          label="Mode"
          value={modeValue}
          options={modeValue === 'Custom' ? ['Custom', ...modeOptions] : modeOptions}
          onChange={handleModeChange}
        />
        <StatusSelect
          label="Distance"
          value={String(preferences.radiusKm)}
          options={radiusOptions.map(String)}
          suffix=" km"
          onChange={(value) => onUpdatePreferences({ radiusKm: Number(value) })}
        />
        <StatusSelect
          label="Price"
          value={preferences.priceLevel}
          options={[...priceLevels]}
          onChange={(value) =>
            onUpdatePreferences({ priceLevel: value as Preferences['priceLevel'] })
          }
        />
      </div>
      <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
        Tap Mode, Distance, or Price to choose.
      </p>
      <Button
        onClick={onFindNearby}
        disabled={isSearching}
        className="mt-3 h-12 w-full rounded-lg"
      >
        <Search className="size-4" aria-hidden="true" />
        {isSearching ? 'Searching nearby' : 'Search nearby'}
      </Button>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {quickModes.map((mode) => (
          <button
            key={mode.label}
            type="button"
            onClick={mode.action}
            className="min-h-12 rounded-lg bg-secondary px-2 text-xs font-semibold text-primary transition hover:bg-[#ffdea9] hover:text-[#271900]"
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function StatusSelect({
  label,
  value,
  options,
  suffix = '',
  onChange,
}: {
  label: string
  value: string
  options: string[]
  suffix?: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const displayValue = `${value}${suffix}`
  const menuId = `${label.toLowerCase()}-status-menu`

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  function handleSelect(nextValue: string) {
    onChange(nextValue)
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="listbox"
        aria-label={label}
        onClick={() => setIsOpen((current) => !current)}
        className="relative block min-h-[58px] w-full cursor-pointer rounded-lg border border-border/50 bg-secondary px-2 py-2 pr-7 text-center transition hover:border-primary hover:shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block text-[11px] font-semibold uppercase text-muted-foreground">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-center text-sm font-semibold text-primary">
          {displayValue}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-primary"
          aria-hidden="true"
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id={menuId}
            role="listbox"
            aria-label={`${label} options`}
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-64 overflow-y-auto rounded-lg border border-border/70 bg-card p-1.5 text-left shadow-xl"
          >
            {options.map((option) => {
              const selected = option === value

              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelect(option)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'text-primary hover:bg-secondary'
                  }`}
                >
                  {option}
                  {suffix}
                </button>
              )
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function SortControls({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (value: SortOption) => void
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-primary">Sort results</p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition ${
              value === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-primary hover:bg-[#ffdea9] hover:text-[#271900]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EmptyResults({
  query,
  onClear,
  onIncreaseRadius,
  onOpenMaps,
  onTryCafe,
}: {
  query: string
  onClear: () => void
  onIncreaseRadius: () => void
  onOpenMaps: () => void
  onTryCafe: () => void
}) {
  return (
    <section className="px-4 pt-5">
      <div className="rounded-xl border border-border/70 bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary">
          <Search className="size-6 text-primary" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">No matching places</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          {query ? `No picks for "${query}" right now.` : 'No picks available right now.'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={onTryCafe} className="rounded-lg">
            Try Cafe
          </Button>
          <Button variant="outline" onClick={onIncreaseRadius} className="rounded-lg">
            Wider Distance
          </Button>
          <Button variant="outline" onClick={onClear} className="rounded-lg">
            Reset
          </Button>
          <Button variant="outline" onClick={onOpenMaps} className="rounded-lg">
            Open Maps
          </Button>
        </div>
      </div>
    </section>
  )
}

function sortRestaurants(restaurants: Restaurant[], sortOption: SortOption) {
  return [...restaurants].sort((first, second) => {
    if (sortOption === 'cheapest') {
      return getPriceRank(first.price) - getPriceRank(second.price)
    }

    if (sortOption === 'rating') {
      return second.rating - first.rating
    }

    if (sortOption === 'group') {
      return getGroupRank(second) - getGroupRank(first)
    }

    return (first.distanceKm ?? 99) - (second.distanceKm ?? 99)
  })
}

function prioritizeRestaurantsByPreferences(
  restaurants: Restaurant[],
  preferences: string[],
) {
  const normalizedPreferences = preferences
    .map((preference) => preference.trim().toLowerCase())
    .filter(Boolean)

  if (normalizedPreferences.length === 0) {
    return restaurants
  }

  return [...restaurants].sort(
    (first, second) =>
      getPreferenceScore(second, normalizedPreferences) -
      getPreferenceScore(first, normalizedPreferences),
  )
}

function getPreferenceScore(restaurant: Restaurant, preferences: string[]) {
  const searchableText = [
    restaurant.name,
    restaurant.cuisine,
    restaurant.vibe,
    restaurant.address,
    ...restaurant.menuHighlights,
    ...restaurant.amenities,
    ...restaurant.tags,
  ]
    .join(' ')
    .toLowerCase()

  return preferences.reduce(
    (score, preference) => score + Number(searchableText.includes(preference)),
    0,
  )
}

function getPriceRank(price: string) {
  return price.replaceAll('-', '').length || 2
}

function getGroupRank(restaurant: Restaurant) {
  const text = [...restaurant.tags, ...restaurant.amenities, restaurant.vibe]
    .join(' ')
    .toLowerCase()

  return Number(text.includes('group')) + Number(text.includes('table'))
}

function getOpenStatusLabel(restaurant: Restaurant) {
  const status = restaurant.openStatus.toLowerCase()
  const tags = restaurant.tags.join(' ').toLowerCase()

  if (status.includes('hours listed')) {
    return 'Hours listed'
  }

  if (status.includes('late') || tags.includes('late night')) {
    return 'Late-night friendly'
  }

  if (status.includes('many choices')) {
    return 'Many choices'
  }

  return 'Check live hours'
}

function DragScrollArea({
  ariaLabel,
  children,
  className,
}: {
  ariaLabel?: string
  children: ReactNode
  className: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({
    active: false,
    moved: false,
    scrollLeft: 0,
    startX: 0,
  })

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollRef.current

    if (!scroller || event.pointerType === 'touch') {
      return
    }

    dragState.current = {
      active: true,
      moved: false,
      scrollLeft: scroller.scrollLeft,
      startX: event.clientX,
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollRef.current

    if (!scroller || !dragState.current.active) {
      return
    }

    const distance = event.clientX - dragState.current.startX

    if (Math.abs(distance) > 12) {
      dragState.current.moved = true
      event.currentTarget.setPointerCapture?.(event.pointerId)
      event.preventDefault()
      scroller.scrollLeft = dragState.current.scrollLeft - distance
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    dragState.current.active = false
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    window.setTimeout(() => {
      dragState.current.moved = false
    }, 120)
  }

  return (
    <div
      ref={scrollRef}
      aria-label={ariaLabel}
      className={className}
      onClickCapture={(event) => {
        if (dragState.current.moved) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {children}
    </div>
  )
}

function CategoryScroller({
  activeCategory,
  onSelectCategory,
}: {
  activeCategory: string
  onSelectCategory: (category: (typeof categories)[number]) => void
}) {
  return (
    <DragScrollArea
      ariaLabel="Food type filters"
      className="flex max-w-full cursor-grab touch-pan-x select-none gap-2 overflow-x-auto pb-1 pr-2 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
        {categories.map((category) => (
          <button
            key={category.label}
            type="button"
            onClick={() => onSelectCategory(category)}
            aria-pressed={activeCategory === category.label}
            className={`min-h-10 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-primary hover:shadow-sm ${
              activeCategory === category.label
                ? 'border-[#ffba27] bg-[#ffdea9] text-[#271900]'
                : 'border-border/70 bg-card text-primary'
            }`}
          >
            {category.label}
          </button>
        ))}
    </DragScrollArea>
  )
}

function SearchView({
  activeCategory,
  foodQuery,
  hasSearched,
  isLoadingPlaces,
  permissionState,
  restaurants,
  savedRestaurantIds,
  sortOption,
  statusLabel,
  onFoodQueryChange,
  onOpenMaps,
  onSearchNearby,
  onSelectCategory,
  onSelectRestaurant,
  onSortChange,
  onShare,
  onToggleSaved,
}: {
  activeCategory: string
  foodQuery: string
  hasSearched: boolean
  isLoadingPlaces: boolean
  permissionState: LocationPermissionState
  restaurants: Restaurant[]
  savedRestaurantIds: Set<string>
  sortOption: SortOption
  statusLabel: string
  onFoodQueryChange: (value: string) => void
  onOpenMaps: (restaurant: Restaurant) => void
  onSearchNearby: (searchText?: string) => void
  onSelectCategory: (category: (typeof categories)[number]) => void
  onSelectRestaurant: (restaurant: Restaurant) => void
  onSortChange: (value: SortOption) => void
  onShare: (restaurant: Restaurant) => void
  onToggleSaved: (restaurant: Restaurant) => void
}) {
  const isSearching = permissionState === 'requesting' || isLoadingPlaces

  return (
    <section className="space-y-5 px-4 py-5">
      <PageTitle title="Search Food" subtitle="Find food, cafes, and chill spots" />

      <Card className="rounded-xl border-border/70">
        <CardContent className="space-y-3 p-4">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_112px] gap-2">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Search food page"
                value={foodQuery}
                onChange={(event) => onFoodQueryChange(event.target.value)}
                placeholder="Search food, cafe, area..."
                className="h-14 rounded-xl border-border/60 bg-background pl-11 text-base"
              />
            </div>
            <Button
              onClick={() => onSearchNearby(foodQuery)}
              disabled={isSearching}
              className="h-14 rounded-xl px-4 text-base font-semibold"
            >
              <LocateFixed className="size-4" aria-hidden="true" />
              {isSearching ? 'Searching' : 'Find'}
            </Button>
          </div>
          <CategoryScroller
            activeCategory={activeCategory}
            onSelectCategory={onSelectCategory}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {statusLabel}
            </span>
            <span>{hasSearched ? restaurants.length : 0} matches</span>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3" aria-label="Search Results">
        <SectionHeader title="Search Results" />
        <SortControls value={sortOption} onChange={onSortChange} />
        <div className="grid gap-3">
          {!hasSearched ? (
            <div className="rounded-xl border border-border/70 bg-card p-5 text-center text-sm text-muted-foreground">
              Type food or location, then press Find to show matches.
            </div>
          ) : restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <PopularCard
                key={`${restaurant.id}-search`}
                isSaved={savedRestaurantIds.has(restaurant.id)}
                restaurant={restaurant}
                onOpenMaps={() => onOpenMaps(restaurant)}
                onSelect={() => onSelectRestaurant(restaurant)}
                onShare={() => onShare(restaurant)}
                onToggleSaved={() => onToggleSaved(restaurant)}
              />
            ))
          ) : (
            <div className="rounded-xl border border-border/70 bg-card p-5 text-center text-sm text-muted-foreground">
              No matching food places right now.
            </div>
          )}
        </div>
      </section>
    </section>
  )
}

function SavedView({
  restaurants,
  onBrowse,
  onOpenMaps,
  onRemove,
  onSelectRestaurant,
  onShare,
}: {
  restaurants: Restaurant[]
  onBrowse: () => void
  onOpenMaps: (restaurant: Restaurant) => void
  onRemove: (restaurant: Restaurant) => void
  onSelectRestaurant: (restaurant: Restaurant) => void
  onShare: (restaurant: Restaurant) => void
}) {
  return (
    <section className="space-y-5 px-4 py-5">
      <PageTitle
        title="Saved Places"
        subtitle={`${restaurants.length} ready picks`}
      />
      <div className="grid gap-3">
        {restaurants.length > 0 ? (
          restaurants.map((restaurant) => (
            <SavedCard
              key={restaurant.id}
              restaurant={restaurant}
              onOpenMaps={() => onOpenMaps(restaurant)}
              onRemove={() => onRemove(restaurant)}
              onSelect={() => onSelectRestaurant(restaurant)}
              onShare={() => onShare(restaurant)}
            />
          ))
        ) : (
          <SavedEmptyCard onBrowse={onBrowse} />
        )}
      </div>
      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle>Shortcut List</CardTitle>
          <CardDescription>
            {restaurants.length > 0
              ? 'Quick food picks for repeat decisions'
              : 'Save restaurants to build your shortcut list'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <button
                key={`${restaurant.id}-shortcut`}
                type="button"
                onClick={() => onOpenMaps(restaurant)}
                className="flex items-center justify-between rounded-lg bg-secondary p-3 text-left"
              >
                <span className="truncate font-semibold">{restaurant.name}</span>
                <Navigation className="size-4 text-primary" aria-hidden="true" />
              </button>
            ))
          ) : (
            <p className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
              Your saved places will appear here after you tap a heart.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function SavedEmptyCard({ onBrowse }: { onBrowse: () => void }) {
  return (
    <Card className="rounded-xl border-border/70">
      <CardContent className="p-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary">
          <Bookmark className="size-6 text-primary" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-xl font-semibold">No saved places yet</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          Tap the heart on any restaurant to keep it here for your next food run.
        </p>
        <Button onClick={onBrowse} className="mt-4 rounded-lg">
          Browse food
        </Button>
      </CardContent>
    </Card>
  )
}

function ActivityView({ restaurants }: { restaurants: Restaurant[] }) {
  const [activePolls, setActivePolls] = useState<Poll[]>(() => [
    {
      id: 'friday-lunch-walk',
      badge: 'Ends in 2h',
      badgeType: 'time',
      title: 'Friday Lunch Walk',
      organizer: 'Organized by Sarah M.',
      voters: ['SM', 'DK', '+3'],
      isJoined: true,
      options: [
        { id: 'nasi-kandar', label: 'Nasi Kandar', votes: 5 },
        { id: 'cafe-bowls', label: 'Cafe Bowls', votes: 2 },
      ],
    },
    {
      id: 'client-meeting-lunch',
      badge: 'Tomorrow, 12:30 PM',
      badgeType: 'date',
      title: 'Client Meeting Lunch',
      organizer: 'Organized by David K.',
      note: 'Where should we take the new client?',
      options: [
        { id: 'madam-kwans', label: "Madam Kwan's KLCC", votes: 0 },
        { id: 'village-park', label: 'Village Park Restaurant', votes: 0 },
      ],
      outline: true,
      isJoined: false,
    },
  ])
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null)
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false)
  const selectedPoll = activePolls.find((poll) => poll.id === selectedPollId) ?? null
  const completedPolls = [
    {
      icon: <Trophy className="size-5" aria-hidden="true" />,
      title: 'Team Building Dinner',
      winner: 'Sushi Zen',
      time: 'Yesterday',
      highlighted: true,
    },
    {
      icon: <Utensils className="size-5" aria-hidden="true" />,
      title: 'Quick Bite',
      winner: 'Burger Joint',
      time: 'Mon',
    },
    {
      icon: <Clock3 className="size-5" aria-hidden="true" />,
      title: 'Coffee Run',
      winner: 'Bean Roasters',
      time: 'Last Week',
    },
    {
      icon: <Users className="size-5" aria-hidden="true" />,
      title: 'Group Snacks',
      winner: 'Inside Scoop',
      time: 'May 28',
    },
  ].slice(0, 3)

  function handlePollAction(pollId: string) {
    const poll = activePolls.find((item) => item.id === pollId)

    if (!poll) {
      return
    }

    if (!poll.isJoined) {
      setActivePolls((currentPolls) =>
        currentPolls.map((currentPoll) =>
          currentPoll.id === pollId
            ? {
                ...currentPoll,
                isJoined: true,
                voters: currentPoll.voters?.includes('You')
                  ? currentPoll.voters
                  : [...(currentPoll.voters ?? []), 'You'],
              }
            : currentPoll,
        ),
      )
      toast.success('Joined poll')
      return
    }

    setSelectedPollId(pollId)
  }

  function submitVote(pollId: string, optionId: string | null) {
    setActivePolls((currentPolls) =>
      currentPolls.map((poll) =>
        poll.id === pollId ? updatePollVote(poll, optionId) : poll,
      ),
    )
    setSelectedPollId(null)
    toast.success(optionId ? 'Vote updated' : 'Vote removed')
  }

  function createPoll(poll: Poll) {
    setActivePolls((currentPolls) => [poll, ...currentPolls])
    setIsCreatePollOpen(false)
    toast.success('Poll added')
  }

  return (
    <section className="space-y-5 px-4 py-5 pb-28">
      <PageTitle
        title="Team Activity"
        subtitle="Vote on active polls or review past decisions."
      />

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <Clock3 className="size-5 text-accent" aria-hidden="true" />
          Active Polls
        </h3>
        {activePolls.map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            onAction={() => handlePollAction(poll.id)}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <History className="size-5 text-muted-foreground" aria-hidden="true" />
          Completed Polls
        </h3>
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          {completedPolls.map((poll) => (
            <CompletedPollItem key={poll.title} {...poll} />
          ))}
        </div>
      </section>

      <Button
        aria-label="Start poll"
        onClick={() => setIsCreatePollOpen(true)}
        className="fixed bottom-24 right-4 z-30 size-14 rounded-full p-0 shadow-xl min-[640px]:right-[calc(50%-17rem)]"
      >
        <Plus className="size-7" aria-hidden="true" />
      </Button>
      <VotePollDialog
        poll={selectedPoll}
        onClose={() => setSelectedPollId(null)}
        onSubmit={submitVote}
      />
      <CreatePollDialog
        isOpen={isCreatePollOpen}
        places={restaurants}
        onClose={() => setIsCreatePollOpen(false)}
        onSubmit={createPoll}
      />
    </section>
  )
}

type PollOption = {
  id: string
  label: string
  votes: number
}

type Poll = {
  id: string
  badge: string
  badgeType: 'date' | 'time'
  title: string
  organizer: string
  note?: string
  options: PollOption[]
  outline?: boolean
  voters?: string[]
  isJoined: boolean
  userVoteOptionId?: string
}

function PollCard({ poll, onAction }: { poll: Poll; onAction: () => void }) {
  const totalVotes = poll.options.reduce((total, option) => total + option.votes, 0)
  const actionLabel = !poll.isJoined
    ? 'Join Poll'
    : poll.userVoteOptionId
      ? 'Update Vote'
      : 'Vote Now'

  return (
    <Card className="rounded-xl border-border/70 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge
              variant={poll.outline ? 'secondary' : 'accent'}
              className="mb-2 rounded-full"
            >
              {poll.badgeType === 'time' ? (
                <Clock3 className="size-3.5" aria-hidden="true" />
              ) : (
                <CalendarDays className="size-3.5" aria-hidden="true" />
              )}
              {poll.badge}
            </Badge>
            <h4 className="text-lg font-semibold">{poll.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{poll.organizer}</p>
          </div>
          {poll.voters && poll.voters.length > 0 ? (
            <div className="flex shrink-0 -space-x-2">
              {poll.voters.map((voter) => (
                <span
                  key={voter}
                  className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-xs font-semibold text-primary"
                >
                  {voter}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {poll.note ? (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm italic text-muted-foreground">
            "{poll.note}"
          </p>
        ) : null}

        {poll.options.length > 0 ? (
          <div className="space-y-2">
            {poll.options.map((option) => (
              <VoteBar
                key={option.id}
                label={option.label}
                percent={totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0}
                votes={option.votes}
              />
            ))}
          </div>
        ) : null}

        <Button
          variant={!poll.isJoined ? 'outline' : 'default'}
          onClick={onAction}
          className="h-12 w-full rounded-lg"
        >
          {!poll.isJoined ? (
            <Users className="size-4" aria-hidden="true" />
          ) : (
            <Trophy className="size-4" aria-hidden="true" />
          )}
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

function updatePollVote(poll: Poll, nextOptionId: string | null): Poll {
  const previousOptionId = poll.userVoteOptionId

  return {
    ...poll,
    isJoined: true,
    userVoteOptionId: nextOptionId ?? undefined,
    options: poll.options.map((option) => {
      let nextVotes = option.votes

      if (previousOptionId === option.id) {
        nextVotes = Math.max(0, nextVotes - 1)
      }

      if (nextOptionId === option.id) {
        nextVotes += 1
      }

      return { ...option, votes: nextVotes }
    }),
  }
}

function VotePollDialog({
  onClose,
  onSubmit,
  poll,
}: {
  onClose: () => void
  onSubmit: (pollId: string, optionId: string | null) => void
  poll: Poll | null
}) {
  const noVoteSelection = '__no_vote__'
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const selectedOptionExists =
    poll?.options.some((option) => option.id === selectedOptionId) ?? false
  const currentSelectionId =
    selectedOptionId === noVoteSelection
      ? ''
      : selectedOptionExists
        ? selectedOptionId
        : poll?.userVoteOptionId || ''
  const canSubmit = Boolean(currentSelectionId || poll?.userVoteOptionId)
  const submitLabel =
    poll?.userVoteOptionId && !currentSelectionId
      ? 'Remove Vote'
      : poll?.userVoteOptionId
        ? 'Update Vote'
        : 'Submit Vote'

  return (
    <AnimatePresence>
      {poll ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 px-4 py-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vote-poll-title"
            className="w-full max-w-lg rounded-xl border border-border/70 bg-card p-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 18 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Choose one place</p>
                <h2 id="vote-poll-title" className="mt-1 text-2xl font-semibold text-primary">
                  {poll.title}
                </h2>
              </div>
              <Button variant="outline" className="rounded-lg" onClick={onClose}>
                Close
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {poll.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={currentSelectionId === option.id}
                  onClick={() =>
                    setSelectedOptionId(() =>
                      currentSelectionId === option.id ? noVoteSelection : option.id,
                    )
                  }
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                    currentSelectionId === option.id
                      ? 'border-primary bg-secondary text-primary'
                      : 'border-border/70 bg-card hover:bg-secondary'
                  }`}
                >
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-sm text-muted-foreground">{option.votes} votes</span>
                </button>
              ))}
            </div>

            <Button
              className="mt-4 h-12 w-full rounded-lg"
              disabled={!canSubmit}
              onClick={() => onSubmit(poll.id, currentSelectionId || null)}
            >
              {submitLabel}
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function CreatePollDialog({
  isOpen,
  onClose,
  onSubmit,
  places,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (poll: Poll) => void
  places: Restaurant[]
}) {
  const defaultPlaces = useMemo(() => places.slice(0, 4), [places])
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>(() =>
    defaultPlaces.slice(0, 2).map((place) => place.id),
  )
  const [time, setTime] = useState('')

  function resetForm() {
    setDate('')
    setDescription('')
    setName('')
    setSelectedPlaceIds(defaultPlaces.slice(0, 2).map((place) => place.id))
    setTime('')
  }

  function closeDialog() {
    resetForm()
    onClose()
  }

  function togglePlace(placeId: string) {
    setSelectedPlaceIds((currentIds) =>
      currentIds.includes(placeId)
        ? currentIds.filter((id) => id !== placeId)
        : [...currentIds, placeId],
    )
  }

  function submitNewPoll() {
    const selectedPlaces = defaultPlaces.filter((place) =>
      selectedPlaceIds.includes(place.id),
    )

    if (!name.trim() || selectedPlaces.length === 0) {
      toast.warning('Add a poll name and at least one place.')
      return
    }

    onSubmit({
      id: `poll-${Date.now()}`,
      badge: [date || 'Today', time].filter(Boolean).join(', '),
      badgeType: 'date',
      title: name.trim(),
      organizer: 'Organized by you',
      note: description.trim() || undefined,
      options: selectedPlaces.map((place) => ({
        id: place.id,
        label: place.name,
        votes: 0,
      })),
      outline: true,
      isJoined: true,
      voters: ['You'],
    })
    resetForm()
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 px-4 py-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={closeDialog}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-poll-title"
            className="max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-xl border border-border/70 bg-card p-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 18 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">New team vote</p>
                <h2 id="create-poll-title" className="mt-1 text-2xl font-semibold text-primary">
                  Start Poll
                </h2>
              </div>
              <Button variant="outline" className="rounded-lg" onClick={closeDialog}>
                Close
              </Button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  aria-label="Poll date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
                <Input
                  aria-label="Poll time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </div>
              <Input
                aria-label="Poll name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Poll name"
              />
              <Input
                aria-label="Poll description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Description"
              />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Place to eat</p>
                {defaultPlaces.map((place) => (
                  <label
                    key={place.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/70 bg-card px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {place.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {place.cuisine} · {place.price}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedPlaceIds.includes(place.id)}
                      onChange={() => togglePlace(place.id)}
                      className="size-5"
                    />
                  </label>
                ))}
              </div>
            </div>

            <Button className="mt-4 h-12 w-full rounded-lg" onClick={submitNewPoll}>
              Add Poll
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function VoteBar({
  label,
  percent,
  votes,
}: {
  label: string
  percent: number
  votes: number
}) {
  return (
    <div className="relative flex h-9 items-center overflow-hidden rounded-full bg-secondary px-3">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-primary/10"
        style={{ width: `${percent}%` }}
      />
      <span className="relative z-10 text-sm">{label}</span>
      <span className="relative z-10 ml-auto text-xs font-semibold text-muted-foreground">
        {votes} votes
      </span>
    </div>
  )
}

function CompletedPollItem({
  highlighted = false,
  icon,
  time,
  title,
  winner,
}: {
  highlighted?: boolean
  icon: ReactNode
  time: string
  title: string
  winner: string
}) {
  return (
    <button
      type="button"
      className="grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 p-4 text-left transition last:border-b-0 hover:bg-secondary/70"
    >
      <span
        className={`flex size-10 items-center justify-center rounded-full ${
          highlighted ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
          Winner: <span className="font-semibold text-primary">{winner}</span>
        </span>
      </span>
      <span className="text-xs font-semibold text-muted-foreground">{time}</span>
    </button>
  )
}

function ProfileView({
  authenticatedUser,
  dietaryPreferences,
  onAddPreference,
  onBrowseFood,
  onLogOut,
  onOpenMaps,
  onRemovePreference,
  onRemoveSaved,
  onSelectRestaurant,
  onShareRestaurant,
  savedRestaurants,
  statusLabel,
}: {
  authenticatedUser: AuthUser
  dietaryPreferences: string[]
  savedRestaurants: Restaurant[]
  onAddPreference: (preference: string) => void
  onBrowseFood: () => void
  onLogOut: () => void
  onOpenMaps: (restaurant: Restaurant) => void
  onRemovePreference: (preference: string) => void
  onRemoveSaved: (restaurant: Restaurant) => void
  onSelectRestaurant: (restaurant: Restaurant) => void
  onShareRestaurant: (restaurant: Restaurant) => void
  statusLabel: string
}) {
  const [isPreferenceDialogOpen, setIsPreferenceDialogOpen] = useState(false)
  const [editingAccountField, setEditingAccountField] =
    useState<AccountField | null>(null)
  const [accountDetails, setAccountDetails] = useState<Record<AccountField, string>>({
    email: '',
    password: '',
    payment: '',
  })

  function updateAccountField(field: AccountField, value: string) {
    setAccountDetails((current) => ({ ...current, [field]: value }))
  }

  return (
    <section className="space-y-5 px-4 py-5">
      <Card className="rounded-xl border-border/70 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left">
          <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-secondary">
            <UserRound className="size-12 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-semibold text-primary">
              {authenticatedUser.username}
            </h2>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="accent" className="rounded-full">
                <Star className="size-3.5" aria-hidden="true" />
                Team Captain
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatJoinedDate(authenticatedUser.joinedAt)}
              </span>
            </div>
          </div>
          <Button variant="secondary" size="icon" aria-label="Edit profile">
            <Edit3 className="size-5" aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Utensils className="size-5 text-primary" aria-hidden="true" />
            Dietary Requirements
          </CardTitle>
          <CardDescription>
            Used to shape restaurant recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {dietaryPreferences.map((preference) => (
              <button
                key={preference}
                type="button"
                onClick={() => onRemovePreference(preference)}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#e0f2f1] px-3 py-1.5 text-sm font-semibold text-[#00695c] transition hover:bg-[#c7e8e5]"
                aria-label={`Remove ${preference} preference`}
              >
                {preference}
                <span className="text-xs" aria-hidden="true">
                  x
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsPreferenceDialogOpen(true)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-dashed border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add
            </button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionHeader title="Saved Places" />
        <div className="grid gap-3">
          {savedRestaurants.length > 0 ? (
            savedRestaurants.map((restaurant) => (
              <SavedCard
                key={`${restaurant.id}-profile`}
                restaurant={restaurant}
                onOpenMaps={() => onOpenMaps(restaurant)}
                onRemove={() => onRemoveSaved(restaurant)}
                onSelect={() => onSelectRestaurant(restaurant)}
                onShare={() => onShareRestaurant(restaurant)}
              />
            ))
          ) : (
            <SavedEmptyCard onBrowse={onBrowseFood} />
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5 text-primary" aria-hidden="true" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/70">
            <ProfileMenuItem
              icon={<Mail className="size-5" />}
              label="Email Address"
              value={accountDetails.email}
              onClick={() => setEditingAccountField('email')}
            />
            <ProfileMenuItem
              icon={<Lock className="size-5" />}
              label="Password"
              value={accountDetails.password ? 'Saved password' : ''}
              onClick={() => setEditingAccountField('password')}
            />
            <ProfileMenuItem
              icon={<CreditCard className="size-5" />}
              label="Payment Methods"
              value={accountDetails.payment}
              onClick={() => setEditingAccountField('payment')}
            />
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5 text-primary" aria-hidden="true" />
              Notification Preferences
            </CardTitle>
            <CardDescription>{statusLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileToggle
              checked
              title="Push Notifications"
              subtitle="Updates on group votes"
            />
            <ProfileToggle
              title="Email Newsletters"
              subtitle="Weekly top spots"
            />
          </CardContent>
        </Card>
      </div>

      <Button
        variant="outline"
        onClick={onLogOut}
        className="h-12 w-full rounded-lg border-[#d56b6b] text-[#b42323] hover:bg-[#fff0f0]"
      >
        <LogOut className="size-5" aria-hidden="true" />
        Log Out
      </Button>

      <PreferenceDialog
        isOpen={isPreferenceDialogOpen}
        onClose={() => setIsPreferenceDialogOpen(false)}
        onAddPreference={onAddPreference}
      />
      {editingAccountField ? (
        <AccountInputDialog
          key={editingAccountField}
          field={editingAccountField}
          value={accountDetails[editingAccountField]}
          onClose={() => setEditingAccountField(null)}
          onSave={updateAccountField}
        />
      ) : null}
    </section>
  )
}

type AccountField = 'email' | 'password' | 'payment'

const accountFieldCopy: Record<
  AccountField,
  { label: string; placeholder: string; type: string }
> = {
  email: {
    label: 'Email Address',
    placeholder: 'alex@example.com',
    type: 'email',
  },
  password: {
    label: 'Password',
    placeholder: 'Enter a new password',
    type: 'password',
  },
  payment: {
    label: 'Payment Methods',
    placeholder: 'Visa ending 4242',
    type: 'text',
  },
}

function ProfileMenuItem({
  icon,
  label,
  onClick,
  value,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  value?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:text-primary"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm">{label}</span>
          {value ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {value}
            </span>
          ) : null}
        </span>
      </span>
      <ChevronDown
        className="size-4 -rotate-90 text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  )
}

function ProfileToggle({
  checked = false,
  subtitle,
  title,
}: {
  checked?: boolean
  subtitle: string
  title: string
}) {
  const [isChecked, setIsChecked] = useState(checked)

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-sm">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={title}
        onClick={() => setIsChecked((current) => !current)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
          isChecked
            ? 'border-primary bg-primary'
            : 'border-border bg-secondary'
        }`}
      >
        <motion.span
          className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm"
          animate={{ x: isChecked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        />
      </button>
    </div>
  )
}

function PreferenceDialog({
  isOpen,
  onAddPreference,
  onClose,
}: {
  isOpen: boolean
  onAddPreference: (preference: string) => void
  onClose: () => void
}) {
  const [preference, setPreference] = useState('')

  function submitPreference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onAddPreference(preference)
    setPreference('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end bg-black/35 px-4 pb-4 sm:items-center sm:justify-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label="Add preference"
            onSubmit={submitPreference}
            className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-primary">Add preference</h3>
              <p className="text-sm text-muted-foreground">
                Recommendations will rank matching shops higher.
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <label className="text-sm font-semibold" htmlFor="profile-preference">
                Preference
              </label>
              <Input
                id="profile-preference"
                value={preference}
                onChange={(event) => setPreference(event.target.value)}
                placeholder="Halal, vegan, spicy, cafe..."
                className="h-12 rounded-lg"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Preference</Button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function AccountInputDialog({
  field,
  onClose,
  onSave,
  value,
}: {
  field: AccountField
  onClose: () => void
  onSave: (field: AccountField, value: string) => void
  value: string
}) {
  const [inputValue, setInputValue] = useState(value)

  const copy = accountFieldCopy[field]

  function submitAccountField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(field, inputValue.trim())
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end bg-black/35 px-4 pb-4 sm:items-center sm:justify-center sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="presentation"
      >
        <motion.form
          role="dialog"
          aria-modal="true"
          aria-label={copy.label}
          onSubmit={submitAccountField}
          className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-primary">{copy.label}</h3>
            <p className="text-sm text-muted-foreground">
              Update your account information for this profile.
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold" htmlFor={`account-${field}`}>
              {copy.label}
            </label>
            <Input
              id={`account-${field}`}
              type={copy.type}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={copy.placeholder}
              className="h-12 rounded-lg"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  )
}

function SettingsView({
  preferences,
  onUpdatePreferences,
}: {
  preferences: Preferences
  onUpdatePreferences: (nextPreferences: Partial<Preferences>) => void
}) {
  return (
    <section className="space-y-5 px-4 py-5">
      <PageTitle title="Settings" subtitle="Adjust your food finder defaults" />

      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle>Search Distance</CardTitle>
          <CardDescription>{preferences.radiusKm} km around your area</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={[preferences.radiusKm]}
            min={1}
            max={20}
            step={1}
            onValueChange={([radiusKm]) => onUpdatePreferences({ radiusKm })}
            aria-label="Settings distance range"
          />
          <div className="grid grid-cols-4 gap-2">
            {[1, 3, 5, 10].map((radius) => (
              <Button
                key={radius}
                variant={preferences.radiusKm === radius ? 'default' : 'outline'}
                onClick={() => onUpdatePreferences({ radiusKm: radius })}
                className="rounded-lg"
              >
                {radius} km
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle>Price Range</CardTitle>
          <CardDescription>Default budget level for food searches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 overflow-hidden rounded-lg border bg-card">
            {(['$', '$$', '$$$', '$$$$'] as const).map((price) => (
              <button
                key={price}
                type="button"
                onClick={() => onUpdatePreferences({ priceLevel: price })}
                className={`h-12 border-r text-base font-semibold last:border-r-0 ${
                  preferences.priceLevel === price
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground'
                }`}
              >
                {price}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle>Food Preferences</CardTitle>
          <CardDescription>Quick filters for your searches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingToggle
            checked={preferences.halalOnly}
            label="Halal"
            onChange={(checked) => onUpdatePreferences({ halalOnly: checked })}
          />
          <SettingToggle
            checked={preferences.groupFriendly}
            label="Group Friendly"
            onChange={(checked) =>
              onUpdatePreferences({ groupFriendly: checked })
            }
          />
        </CardContent>
      </Card>
    </section>
  )
}

function SettingToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
      <span className="font-semibold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5"
      />
    </label>
  )
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold text-primary">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex min-w-0 items-end justify-between gap-3 pr-4">
      <h2 className="min-w-0 truncate text-2xl font-semibold">{title}</h2>
      {action ? (
        <button type="button" className="shrink-0 text-sm font-semibold text-primary">
          {action}
        </button>
      ) : null}
    </div>
  )
}

function RecommendedSkeleton() {
  return (
    <div className="w-72 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="h-40 animate-pulse bg-secondary" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-44 animate-pulse rounded bg-secondary" />
        <div className="h-4 w-32 animate-pulse rounded bg-secondary" />
        <div className="flex gap-3">
          <div className="h-4 w-16 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
        </div>
      </div>
    </div>
  )
}

function FoodImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className: string
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[linear-gradient(135deg,#ffdea9_0%,#f7fafa_45%,#9ff0fb_100%)] ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(255,183,2,0.35)_0%,transparent_34%,rgba(0,83,91,0.14)_70%,transparent_100%)]" />
      <img
        src={src}
        alt={alt}
        loading="eager"
        onError={(event) => {
          event.currentTarget.style.display = 'none'
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  )
}

function RecommendedCard({
  isSaved,
  restaurant,
  onOpenMaps,
  onSelect,
  onShare,
  onToggleSaved,
}: {
  isSaved: boolean
  restaurant: Restaurant
  onOpenMaps: () => void
  onSelect: () => void
  onShare: () => void
  onToggleSaved: () => void
}) {
  return (
    <article className="w-72 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card text-left shadow-sm transition hover:border-primary hover:shadow-md">
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="relative h-40">
          <FoodImage
            src={restaurant.imageUrl}
            alt={`${restaurant.name} preview`}
            className="h-full w-full"
          />
          <span className="absolute left-3 top-3 rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
            {restaurant.source === 'live' ? 'Live nearby' : 'Demo spot'}
          </span>
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-card/95 px-2 py-1 text-sm font-semibold shadow-sm">
            <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
            {restaurant.rating}
          </span>
        </div>
        <div className="space-y-3 p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-semibold">{restaurant.name}</h3>
              <p className="text-sm text-muted-foreground">
                {restaurant.cuisine} · {restaurant.price}
              </p>
            </div>
            <Heart
              className={`size-6 ${
                isSaved ? 'fill-primary text-primary' : 'text-border'
              }`}
              aria-hidden="true"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <MiniStat label="Distance" value={`${restaurant.distanceKm ?? '-'} km`} />
            <MiniStat label="Price" value={restaurant.price} />
            <MiniStat label="Time" value={restaurant.travelTime} />
          </div>
          <div className="rounded-lg border border-border/40 bg-secondary p-2 text-sm text-muted-foreground">
            <span className="font-semibold text-primary">Popular:</span>{' '}
            {restaurant.menuHighlights.slice(0, 2).join(', ')}
          </div>
          <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {restaurant.vibe}
          </p>
        </div>
      </button>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <Button onClick={onSelect} className="h-10 rounded-lg">
          View
        </Button>
        <Button
          variant={isSaved ? 'default' : 'outline'}
          onClick={onToggleSaved}
          aria-label={`${isSaved ? 'Unsave' : 'Save'} ${restaurant.name}`}
          className="h-10 rounded-lg"
        >
          <Heart
            className={`size-4 ${isSaved ? 'fill-current' : ''}`}
            aria-hidden="true"
          />
          {isSaved ? 'Saved' : 'Save'}
        </Button>
        <Button
          variant="outline"
          onClick={onOpenMaps}
          aria-label={`Open ${restaurant.name} in Maps`}
          className="h-10 rounded-lg"
        >
          <Navigation className="size-4" aria-hidden="true" />
          Maps
        </Button>
        <Button
          variant="outline"
          onClick={onShare}
          aria-label={`Share ${restaurant.name}`}
          className="h-10 rounded-lg"
        >
          <Share2 className="size-4" aria-hidden="true" />
          Share
        </Button>
      </div>
    </article>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary px-2 py-2">
      <p className="truncate text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-primary">{value}</p>
    </div>
  )
}

function PopularCard({
  isSaved = false,
  restaurant,
  onOpenMaps,
  onSelect,
  onShare,
  onToggleSaved,
}: {
  isSaved?: boolean
  restaurant: Restaurant
  onOpenMaps?: () => void
  onSelect: () => void
  onShare?: () => void
  onToggleSaved?: () => void
}) {
  return (
    <article className="rounded-xl border border-border/50 bg-card shadow-sm transition hover:border-primary hover:shadow-md">
      <button
        type="button"
        onClick={onSelect}
        className="grid w-full min-w-0 cursor-pointer grid-cols-[104px_minmax(0,1fr)] gap-4 p-3 text-left sm:grid-cols-[112px_minmax(0,1fr)]"
      >
        <FoodImage
          src={restaurant.imageUrl}
          alt={`${restaurant.name} food`}
          className="size-[104px] rounded-lg sm:size-28"
        />
        <div className="min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-semibold">{restaurant.name}</h3>
              <p className="truncate text-sm text-muted-foreground">
                {restaurant.cuisine} · {restaurant.price}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm">
              <Star className="size-4 text-accent" aria-hidden="true" />
              {restaurant.rating}
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {restaurant.vibe}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            <Badge variant="secondary" className="rounded-md">
              {restaurant.tags[0] ?? 'Popular'}
            </Badge>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-4" aria-hidden="true" />
              {restaurant.distanceKm ?? '-'} km
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#b07800]">
              <Clock3 className="size-4" aria-hidden="true" />
              {getOpenStatusLabel(restaurant)}
            </span>
          </div>
        </div>
      </button>
      {onOpenMaps || onShare || onToggleSaved ? (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          <Button onClick={onSelect} className="h-10 rounded-lg">
            View details
          </Button>
          {onToggleSaved ? (
            <Button
              variant={isSaved ? 'default' : 'outline'}
              onClick={onToggleSaved}
              aria-label={`${isSaved ? 'Unsave' : 'Save'} ${restaurant.name}`}
              className="h-10 rounded-lg"
            >
              <Heart
                className={`size-4 ${isSaved ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          ) : null}
          {onOpenMaps ? (
            <Button
              variant="outline"
              onClick={onOpenMaps}
              aria-label={`Open ${restaurant.name} in Maps`}
              className="h-10 rounded-lg"
            >
              <Navigation className="size-4" aria-hidden="true" />
              Maps
            </Button>
          ) : null}
          {onShare ? (
            <Button
              variant="outline"
              onClick={onShare}
              aria-label={`Share ${restaurant.name}`}
              className="h-10 rounded-lg"
            >
              <Share2 className="size-4" aria-hidden="true" />
              Share
            </Button>
          ) : null}
      </div>
      ) : null}
    </article>
  )
}

function SavedCard({
  restaurant,
  onOpenMaps,
  onRemove,
  onSelect,
  onShare,
}: {
  restaurant: Restaurant
  onOpenMaps: () => void
  onRemove: () => void
  onSelect: () => void
  onShare: () => void
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[96px_minmax(0,1fr)]">
        <div className="relative">
          <FoodImage
            src={restaurant.imageUrl}
            alt={`${restaurant.name} saved`}
            className="size-[88px] rounded-lg sm:size-24"
          />
          <span className="absolute right-2 top-2 rounded-full bg-card p-2 shadow-sm">
            <Bookmark className="size-4 text-[#7d5800]" aria-hidden="true" />
          </span>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">{restaurant.name}</h3>
              <p className="truncate text-sm text-muted-foreground">
                {restaurant.cuisine} · {restaurant.distanceKm} km · {restaurant.rating}
              </p>
            </div>
            <Badge variant="accent" className="rounded-full">
              {getOpenStatusLabel(restaurant)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onSelect} className="rounded-lg">
              View
            </Button>
            <Button
              variant="outline"
              onClick={onOpenMaps}
              aria-label={`Open ${restaurant.name} in Maps`}
              className="rounded-lg"
            >
              <Navigation className="size-4" aria-hidden="true" />
              Maps
            </Button>
            <Button
              variant="outline"
              onClick={onShare}
              aria-label={`Share ${restaurant.name}`}
              className="rounded-lg"
            >
              <Share2 className="size-4" aria-hidden="true" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={onRemove}
              aria-label={`Remove ${restaurant.name} from saved`}
              className="rounded-lg"
            >
              <Heart className="size-4 fill-primary text-primary" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RestaurantDetailPopup({
  isSaved,
  restaurant,
  onClose,
  onOpenMaps,
  onCopy,
  onShare,
  onToggleSaved,
}: {
  isSaved: boolean
  restaurant: Restaurant | null
  onClose: () => void
  onOpenMaps: (restaurant: Restaurant) => void
  onCopy: (restaurant: Restaurant) => void
  onShare: (restaurant: Restaurant) => void
  onToggleSaved: (restaurant: Restaurant) => void
}) {
  useEffect(() => {
    if (!restaurant) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, restaurant])

  return (
    <AnimatePresence>
      {restaurant ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 px-4 py-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="restaurant-detail-title"
            className="max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-xl border border-border/70 bg-card shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 18 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    id="restaurant-detail-title"
                    className="text-2xl font-semibold text-primary"
                  >
                    {restaurant.name}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {restaurant.cuisine} · {restaurant.vibe}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-10 shrink-0 rounded-lg px-3"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>

              <div className="relative overflow-hidden rounded-xl">
                <FoodImage
                  src={restaurant.imageUrl}
                  alt={`${restaurant.name} detail`}
                  className="h-52 w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <DecisionStat label="Rating" value={String(restaurant.rating)} />
                <DecisionStat label="Price" value={restaurant.price} />
                <DecisionStat
                  label="Distance"
                  value={`${restaurant.distanceKm ?? '-'} km`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-12 rounded-lg"
                  onClick={() => onOpenMaps(restaurant)}
                >
                  <Navigation className="size-5" aria-hidden="true" />
                  Go Now
                </Button>
                <Button
                  variant={isSaved ? 'default' : 'outline'}
                  onClick={() => onToggleSaved(restaurant)}
                  aria-label={`${isSaved ? 'Unsave' : 'Save'} ${restaurant.name}`}
                  className="h-12 rounded-lg"
                >
                  <Heart
                    className={`size-5 ${isSaved ? 'fill-current' : ''}`}
                    aria-hidden="true"
                  />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onShare(restaurant)}
                  aria-label={`Share ${restaurant.name}`}
                  className="h-12 rounded-lg"
                >
                  <Share2 className="size-5" aria-hidden="true" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onCopy(restaurant)}
                  aria-label={`Copy ${restaurant.name} link`}
                  className="h-12 rounded-lg"
                >
                  <Copy className="size-5" aria-hidden="true" />
                  Copy
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="accent" className="rounded-full px-3 py-2">
                  <Clock3 className="size-4" aria-hidden="true" />
                  {getOpenStatusLabel(restaurant)}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-2">
                  {restaurant.price}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-2">
                  <MapPin className="size-4" aria-hidden="true" />
                  {restaurant.distanceKm ?? '-'} km
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-2">
                  <Star className="size-4" aria-hidden="true" />
                  {restaurant.rating}
                </Badge>
              </div>

              <section className="space-y-3">
                <h3 className="text-xl font-semibold">Why This Place</h3>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="text-base leading-6 text-foreground">
                    {restaurant.vibe}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {restaurant.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-md">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-5 text-muted-foreground">
                    {restaurant.source === 'live'
                      ? 'Loaded from nearby map data. Open Maps for live reviews, directions, and exact hours.'
                      : 'Real demo listing for app preview. Open Maps for live reviews, directions, and exact hours.'}
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xl font-semibold">What's Inside</h3>
                <div className="grid grid-cols-2 gap-2">
                  {restaurant.menuHighlights.map((item) => (
                    <span
                      key={item}
                      className="rounded-xl bg-[#9ff0fb] px-4 py-3 text-sm font-semibold text-[#001f23]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xl font-semibold">Place Details</h3>
                <div className="divide-y rounded-xl border bg-card">
                  <DetailRow icon={<MapPin className="size-6 text-primary" />} text={restaurant.address} />
                  <DetailRow icon={<Clock3 className="size-6 text-muted-foreground" />} text={restaurant.hours} />
                  <DetailRow
                    icon={<Filter className="size-6 text-muted-foreground" />}
                    text={restaurant.amenities.join(', ')}
                  />
                </div>
              </section>

            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function DecisionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary px-3 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold text-primary">{value}</p>
    </div>
  )
}

function DetailRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="grid grid-cols-[32px_1fr] gap-4 p-4 text-base">
      {icon}
      <p className="leading-6">{text}</p>
    </div>
  )
}

function NavItem({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} tab`}
      className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-sm transition duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-[0_10px_24px_rgba(0,83,91,0.18)] ${
        active
          ? 'bg-[#dceff1] text-primary shadow-[0_8px_18px_rgba(0,83,91,0.14)]'
          : 'text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default App
