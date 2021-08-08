import { EventEmitter } from 'events'
import { downloadFileAndGetEntries, TDownloadFileOption } from './lib/fileDownloader'
import { logger } from './lib/logger'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import dayjs from 'dayjs'
import { dailyDir, totalDir } from './lib/projectPath'
import { writeEncodedFileAndImport } from './lib/utf8Writer'

const target = process.argv[2]

const downloadOnlyEvent = new EventEmitter()
downloadOnlyEvent.on('assigned', () => {})
downloadOnlyEvent.on('finish', (target: string) => {
  logger.info(`[DonwloadOnlyScriptCompletion] Download ${target} completed.`)
})

const argCandidate = ['--daily', '-d', '--total', '-t']
const date = new Date()

async function main() {
  if (argCandidate.includes(target)) {
    let url = ''
    let downloadDir = ''

    // 매개변수에 따라 다르게 처리
    if (target === '--daily' || target === '-d') {
      logger.info(`[DownloadDailyStart]`)

      const yesterday = dayjs(date.setDate(date.getDate() - 1)).format('YYYYMMDD')
      url = encodeURI(
        `https://www.juso.go.kr/dn.do?reqType=DC&stdde=${yesterday}&indutyCd=999&purpsCd=999&indutyRm=수집종료&purpsRm=수집종료`
      )
      downloadDir = dailyDir
    } else if (target === '--total' || target === '-t') {
      logger.info(`[DownloadTotalStart]`)

      const previousMonth = dayjs(date.setMonth(date.getMonth() - 2)).format('YYYYMM')
      url = encodeURI(
        `https://www.juso.go.kr/dn.do?reqType=ALLMTCHG&regYmd=${previousMonth.slice(
          0,
          4
        )}&ctprvnCd=00&gubun=MTCH&stdde=${previousMonth}&fileName=${previousMonth}_주소DB_전체분.zip&realFileName=${previousMonth}ALLMTCHG00.zip&indutyCd=999&purpsCd=999&indutyRm=수집종료&purpsRm=수집종료`
      )
      downloadDir = totalDir
    }

    if (!existsSync(downloadDir)) {
      mkdirSync(downloadDir, { recursive: true })
    }

    const writeStream = createWriteStream(`${downloadDir}/address_file.zip`)
    ;(await downloadFileAndGetEntries({ url, writeStream } as TDownloadFileOption)).forEach(
      entry => {
        entry.getDataAsync((data, err) => {
          if (err) throw err

          writeEncodedFileAndImport({
            data,
            entryOfZip: entry,
            writeDir: downloadDir,
            doImport: false,
          })
        })
      }
    )
  } else {
    logger.error(`[UnexpectedArgvError] argv ${target} is unsupported.`)
    process.exit(0)
  }
}

main()
  .then()
  .catch(e => {
    logger.error(e)
  })
