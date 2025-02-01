declare global {
    interface Window {
        /**
         * Returns the compiled template from the `/public/hbs/` folder
         */
        readonly getTemplate(templateName: string): Promise<(context: object) => string>
    }
}

export {}
