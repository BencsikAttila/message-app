declare global {
    interface Window {
        readonly getTemplate(templateName: string): Promise<(context: object) => string>

        readonly ENV: {
            channel?: import('../../src/db/model').default['channels']
            user?: import('../../src/db/model').default['users']
        }
    }
}

export {}
