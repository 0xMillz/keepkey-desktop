const TAG = ' | KeepKey | '

import {getConfig, updateConfig} from "keepkey-config";


import log from "electron-log";
import usb from "usb";
import {ipcMain} from "electron";

let Hardware = require("@keepkey/keepkey-hardware-hid")

export let KEEPKEY_FEATURES:any

ipcMain.on('onUpdateFirmware', async event => {
    const tag = TAG + ' | onUpdateFirmware | '
    try {
        let result = await Hardware.getLatestFirmwareData()
        await updateConfig({attemptUpdateFirmware:true})
        let firmware = await Hardware.downloadFirmware(result.firmware.url)
        const updateResponse = await Hardware.loadFirmware(firmware)
        log.info(tag,"updateResponse: ",updateResponse)
        await updateConfig({updatedFirmware:true})
        event.sender.send('onCompleteFirmwareUpload', {
            bootloader:true,
            success:true
        })
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('onUpdateBootloader', async event => {
    const tag = TAG + ' | onUpdateBootloader | '
    try {
        log.info(tag,"checkpoint: ")
        let result = await Hardware.getLatestFirmwareData()
        await updateConfig({attemptUpdateBootlder:true})
        let firmware = await Hardware.downloadFirmware(result.bootloader.url)
        const updateResponse = await Hardware.loadFirmware(firmware)
        log.info(tag,"updateResponse: ",updateResponse)
        await updateConfig({updatedBootloader:true})
        event.sender.send('onCompleteBootloaderUpload', {
            bootloader:true,
            success:true
        })
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('onKeepKeyInfo', async (event, data) => {
    const tag = TAG + ' | onKeepKeyInfo | '
    try {
        KEEPKEY_FEATURES = data.payload
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

export const update_keepkey_status = async function (event) {
    let tag = " | update_keepkey_status | "
    try {
        let config = getConfig()
        //
        let firmwareInfo = await Hardware.getLatestFirmwareData()
        log.info(tag,"firmwareInfo: ",firmwareInfo)
        event.sender.send('loadKeepKeyFirmwareLatest', { payload: firmwareInfo })

        //init
        let resultInit = await Hardware.init()
        if(resultInit && resultInit.success && resultInit.bootloaderMode){
            event.sender.send('setUpdaterMode', { payload: true })
        }
        if(resultInit && resultInit.success && resultInit.wallet){
            KEEPKEY_FEATURES = resultInit
            event.sender.send('loadKeepKeyInfo', { payload: resultInit })
            //if not latest bootloader, set need bootloader update
            if(resultInit.bootloaderVersion !== "v1.1.0" && !config.updatedBootloader){
                event.sender.send('openBootloaderUpdate', { })
                await updateConfig({isNewDevice:true})
                event.sender.send('setUpdaterMode', { payload: true })
            }
            if(config.updatedBootloader){
                //update firmware next
                event.sender.send('openFirmwareUpdate', { })
            }
        }
        log.info(tag,"resultInit: ",resultInit)

        let allDevices = await usb.getDeviceList()
        log.info(tag,"allDevices: ",allDevices)

        let resultWebUsb = await usb.findByIds(11044,2)
        if(resultWebUsb){
            log.info(tag,"KeepKey connected in webusb!")
            //TODO only trigger if firmware modal open
            event.sender.send('onCompleteFirmwareUpload', { })
            //get version
        }

        let resultPreWebUsb = await usb.findByIds(11044,1)
        if(resultPreWebUsb){
            log.info(tag,"update required!")
        }

        let resultUpdater = await usb.findByIds(11044,1)
        if(resultUpdater){
            log.info(tag,"UPDATER MODE DETECTED!")
        }
    }catch(e){
        log.error(e)
    }
}