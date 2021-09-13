import EventEmitter from 'events'
import { createReadStream, readdirSync } from 'fs'
import PoolConnection from 'mysql2/typings/mysql/lib/PoolConnection'
import { createInterface } from 'readline'
import { logger } from '../logger'
import { dailyDir } from '../path'
import { importToDb } from './importFile.address'
import { updateAddinfoTable } from './update/update.addinfo'
import { updateJibunTable } from './update/update.jibun'
import { updateJusoTable } from './update/update.juso'
import { updateDailyAddress } from './updateDaily.address'

const entries = readdirSync(dailyDir)

export const fileDownloadEvent = new EventEmitter()
  .setMaxListeners(31)
  .on('finish', async (date: string) => {
    logger.info(`[DAILY_UPDATE_START] Update start on date ${date}`)
    await updateDailyAddress(date)
  })

export const roadcodeUpdateEvent = new EventEmitter().on(
  'doAfterRoadcodeUpdate',
  (connection: PoolConnection, date: string) => {
    try {
      // 일자가 동일하고 도로명코드가 아닌 데이터 핕터링
      const sameDateEntries = entries.filter(
        entry => entry.includes(date) && !entry.includes('ROAD')
      )

      // TypeORM 쿼리 위임
      for (const entry of sameDateEntries) {
        const rl = createInterface({
          input: createReadStream(dailyDir + '/' + entry),
          crlfDelay: Infinity,
        })

        if (entry.includes('ADDINFO')) {
          rl.on('line', data => {
            updateAddinfoTable(connection, data)
          })
        } else if (entry.includes('JUSO')) {
          rl.on('line', data => {
            updateJusoTable(connection, data)
          })
        } else if (entry.includes('JIBUN')) {
          rl.on('line', data => {
            updateJibunTable(connection, data)
          })
        }
      }
    } catch (err) {
      logger.error(`[QUERY_AFTER_ROADCODE_ERROR] ${err}`)
    }
  }
)

export const afterWriteEvent = new EventEmitter()
  .setMaxListeners(0)
  .on('doImport', (tableName: string) => {
    importToDb(tableName)
  })
  .on('doDailyUpdate', (date: string) => {
    updateDailyAddress(date)
  })
