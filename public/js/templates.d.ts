declare global {
    interface Window {
        /**
         * Contains all the Handlebars templates.
         */
        readonly templates: Record<string, Promise<(context: any) => string>>
    }
}

export {}
