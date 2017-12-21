class LogManager {

    message(...args) {
        if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
            this.console(...args);
        }
    }

    hr (text) {
        if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
            if (!text) {
                this.console('---------------------------------------------------------');
            } else this.console('------------------------', text, '------------------------');
        }
    }

    console(...args) {
        try {
            const updatedArgs = args.map(a => typeof a === 'object' ? JSON.stringify(a, 2, 4) : a);
            console.log(...updatedArgs);
        } catch (err) {
            console.log(...args);
        }
    }
}

export default new LogManager();
