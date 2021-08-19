import { prismaClient } from '../prisma/prismaClient'
import { createReadStream, readdirSync, readSync } from 'fs'
import { dailyDir } from './projectPath'
import { createInterface } from 'readline'
import { logger } from './logger'
import { Prisma } from '@prisma/client'
import {
  TAddInfoTableName,
  TAddInfoTableSchema,
  TIntegratedTableSchema,
  TJibunTableSchema,
  TRoadnameTableSchema,
} from './sido'

const entries = readdirSync(dailyDir)

async function dailyUpdate() {
  for (const entry of entries) {
    const rl = createInterface({
      input: createReadStream(dailyDir + '/' + entry),
      crlfDelay: Infinity,
    })

    let changeReasonCode: string = ''
    let tablename: string = ''

    if (entry.includes('ADDINFO')) {
      rl.on('line', async data => {
        const splitData = data.split('|')
        changeReasonCode = splitData[9]

        const inputData: TAddInfoTableSchema = {
          manage_number: splitData[0],
          hangjungdong_code: splitData[1],
          hangjungdong_name: splitData[2],
          zipcode: splitData[3],
          zipcode_serial_number: splitData[4],
          bulk_delivery_building_name: splitData[5],
          master_building_name: splitData[6],
          sigungu_building_name: splitData[7],
          is_apt: splitData[8],
        }

        const findResult = await prismaClient.addinfo_manage_number_index.findFirst({
          where: {
            manage_number: splitData[0],
          },
          select: {
            tablename: true,
          },
        })

        console.log(findResult)

        tablename = findResult?.tablename as TAddInfoTableName

        if (changeReasonCode === '31') {
          await prismaClient[tablename as TAddInfoTableName].create({
            data: data as TJibunTableSchema,
          })
        } else if (changeReasonCode === '34') {
          await prismaClient[tablename as TAddInfoTableName].update({
            where: { manage_number: inputData.manage_number },
            data: data as TJibunTableSchema,
          })
        } else if (changeReasonCode === '63') {
          await prismaClient[tablename as TAddInfoTableName].delete({
            where: { manage_number: inputData.manage_number },
          })
        }
      })
    } else if (entries.includes('JIBUN')) {
      rl.on('line', async data => {
        const splitData = data.split('|')
        changeReasonCode = splitData[9]

        const inputData: TJibunTableSchema = {
          manage_number: splitData[0],
          serial_number: +splitData[1],
          bupjungdong_code: splitData[2],
          sido_name: splitData[3],
          sigungu_name: splitData[4],
          bupjung_eupmyeondong_name: splitData[5],
          bupjunglee_name: splitData[6],
          is_mountain: splitData[7],
          jibun_primary: +splitData[8],
          jibun_secondary: +splitData[9],
          is_representation: splitData[10],
        }

        const findResult = await prismaClient.jibun_manage_number_index.findFirst({
          where: {
            manage_number: splitData[0],
          },
          select: {
            tablename: true,
          },
        })

        tablename = findResult?.tablename as TAddInfoTableName

        if (changeReasonCode === '31') {
          await prismaClient[tablename as TAddInfoTableName].create({
            data: data as TJibunTableSchema,
          })
        } else if (changeReasonCode === '34') {
          await prismaClient[tablename as TAddInfoTableName].update({
            where: { manage_number: inputData.manage_number },
            data: data as TJibunTableSchema,
          })
        } else if (changeReasonCode === '63') {
          await prismaClient[tablename as TAddInfoTableName].delete({
            where: { manage_number: inputData.manage_number },
          })
        }
      })
    } else if (entries.includes('JUSO')) {
      rl.on('line', async data => {
        const splitData = data.split('|')
        changeReasonCode = splitData[9]

        const inputData: TRoadnameTableSchema = {
          manage_number: splitData[0],
          roadname_code: splitData[1],
          eupmyeondong_number: splitData[2],
          basement: splitData[3],
          building_primary_number: +splitData[4],
          building_secondary_number: +splitData[5],
          basic_area_number: splitData[6],
          change_reason_code: splitData[7],
          notice_date: splitData[8],
          previous_roadname_address: splitData[9],
          has_detail: splitData[10],
        }

        const findResult = await prismaClient.juso_manage_number_index.findFirst({
          where: {
            manage_number: splitData[0],
          },
          select: {
            tablename: true,
          },
        })

        tablename = findResult?.tablename as string

        if (changeReasonCode === '31') {
          await prismaClient[tablename as TAddInfoTableName].create({
            data: data as TJibunTableSchema,
          })
        } else if (changeReasonCode === '34') {
          await prismaClient[tablename as TAddInfoTableName].update({
            where: { manage_number: inputData.manage_number },
            data: data as TJibunTableSchema,
          })
        } else if (changeReasonCode === '63') {
          await prismaClient[tablename as TAddInfoTableName].delete({
            where: { manage_number: inputData.manage_number },
          })
        }
      })
    } else if (entries.includes('ROAD')) {
      rl.on('line', async data => {
        const splitData = data.split('|')

        const inputData: Prisma.roadname_codeCreateInput = {
          roadname_code: splitData[0],
          roadname: splitData[1],
          roadname_eng: splitData[2],
          eupmyeondong_number: splitData[3],
          sido_name: splitData[4],
          sido_eng: splitData[5],
          sigungu: splitData[6],
          sigungu_eng: splitData[7],
          eupmyeondong: splitData[8],
          eupmyeondong_eng: splitData[9],
          eupmyeondong_type: splitData[10],
          eupmyeondong_code: splitData[11],
          is_using: splitData[12],
          change_reason: splitData[13],
          change_history: splitData[14],
          declare_date: splitData[15],
          expire_date: splitData[16],
        }

        try {
          if (inputData.change_history === '신규') {
            await prismaClient.roadname_code.create({ data: inputData })
          } else {
            await prismaClient.roadname_code.upsert({
              where: {
                roadname_code_eupmyeondong_number: {
                  roadname_code: inputData.roadname_code,
                  eupmyeondong_number: inputData.eupmyeondong_number,
                },
              },
              update: inputData,
              create: inputData,
            })
          }
        } catch (e) {
          throw e
        }
      })
    }
  }
}

dailyUpdate()
  .then(() => {
    logger.info('Job finished.')
  })
  .catch(e => logger.error(e))
