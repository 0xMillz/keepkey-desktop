import { ipcMain } from 'electron';
import { uniqueId } from 'lodash';
import { db } from '../../db';
import { windows } from '../../main';
import { shared } from '../../shared';

import { Body, Controller, Get, Post, Header, Route, Tags, Response, SuccessResponse } from 'tsoa';
import { keepkey } from '../';
import { PairBody, PairResponse, Status } from '../types';


export class ApiError extends Error {
    private statusCode: number;
    constructor(name: string, statusCode: number, message?: string) {
        super(message);
        this.name = name;
        this.statusCode = statusCode;
    }
}

@Tags('Client Endpoints')
@Route('')
export class IndexController extends Controller {

    /*
        Health endpoint
    */
    @Get('/status')
    public async status(): Promise<Status> {
        return {
            success: true,
            status: keepkey.STATUS,
            state: keepkey.STATE
        }
    }

    @Get('/device')
    public async device(): Promise<Record<string, unknown>> {
        return shared.KEEPKEY_FEATURES
    }

    @Response(500)
    @Post('/pair')
    public async pair(@Body() body: PairBody, @Header('authorization') serviceKey: string): Promise<PairResponse> {
        return new Promise<PairResponse>(async (resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
                this.setStatus(500)
                return resolve({ success: false, reason: 'Window not open' })
            }

            if (!body.serviceImageUrl || !body.serviceName) {
                this.setStatus(500)
                return resolve({ success: false, reason: 'Missing body parameters' })
            }

            const isAlreadyPaired = await new Promise<boolean>((innerResolve, _reject) => {
                db.findOne({ type: 'service', serviceName: body.serviceName, serviceKey }, (err, doc) => {
                    if (!doc) innerResolve(false)
                    innerResolve(true)
                })
            })

            if (isAlreadyPaired) return resolve({ success: true, reason: 'Service already exists' })

            const nonce = uniqueId()

            windows.mainWindow.webContents.send('@modal/pair', {
                serviceName: body.serviceName,
                serviceImageUrl: body.serviceImageUrl,
                nonce
            })

            if (windows.mainWindow.focusable) windows.mainWindow.focus()

            ipcMain.once(`@bridge/approve-service-${nonce}`, (event, data) => {
                if (data.nonce = nonce) {
                    ipcMain.removeAllListeners(`@bridge/approve-service-${nonce}`)
                    db.insert({
                        type: 'service',
                        addedOn: Date.now(),
                        serviceName: body.serviceName,
                        serviceImageUrl: body.serviceImageUrl,
                        serviceKey
                    })

                    resolve({ success: true, reason: '' })
                }
            })

            ipcMain.once(`@bridge/reject-service-${nonce}`, (event, data) => {
                if (data.nonce = nonce) {
                    ipcMain.removeAllListeners(`@bridge/reject-service-${nonce}`)
                    this.setStatus(401)
                    resolve({ success: false, reason: 'Pairing was rejected by user' })
                }
            })
        })
    }
}
