import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = join(__dirname, '../../data/travel.db')

const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// 旅行计划表：持久化用户的行程数据
db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    city TEXT NOT NULL,
    days INTEGER NOT NULL,
    totalBudget REAL NOT NULL,
    tripData TEXT NOT NULL,
    isFavorite INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`)

export function findUserByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
  return stmt.get(username)
}

export function findUserById(id) {
  const stmt = db.prepare('SELECT id, username, avatar, createdAt FROM users WHERE id = ?')
  return stmt.get(id)
}

export function createUser(username, hashedPassword) {
  const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)')
  stmt.run(username, hashedPassword)
  return findUserByUsername(username)
}

// ===================== 旅行计划 CRUD =====================

/** 保存行程（如果已有同城市行程则更新） */
export function saveTrip(userId, city, days, totalBudget, tripData, isFavorite = 0) {
  const stmt = db.prepare(`
    INSERT INTO trips (userId, city, days, totalBudget, tripData, isFavorite)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(userId, city, days, totalBudget, JSON.stringify(tripData), isFavorite)
  return { id: result.lastInsertRowid }
}

/** 获取用户的所有行程 */
export function getTripsByUserId(userId) {
  const stmt = db.prepare('SELECT * FROM trips WHERE userId = ? ORDER BY createdAt DESC')
  const rows = stmt.all(userId)
  return rows.map(row => ({
    ...row,
    tripData: JSON.parse(row.tripData),
    isFavorite: !!row.isFavorite
  }))
}

/** 删除单条行程 */
export function deleteTripById(id, userId) {
  const stmt = db.prepare('DELETE FROM trips WHERE id = ? AND userId = ?')
  return stmt.run(id, userId)
}

/** 切换收藏状态 */
export function toggleTripFavorite(id, userId) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND userId = ?').get(id, userId)
  if (!trip) return null
  const newFav = trip.isFavorite ? 0 : 1
  db.prepare('UPDATE trips SET isFavorite = ? WHERE id = ?').run(newFav, id)
  return { isFavorite: !!newFav }
}