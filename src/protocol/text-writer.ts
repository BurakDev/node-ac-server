import {Color} from "../interfaces/color";

interface stringifiable {
    toString: () => string;
}

export class TextWriter {
    private text = '';

    constructor() {}

    addText(t: string | stringifiable) {
        this.text += (typeof t === 'string' ? t : t.toString());
        return this;
    }

    setColor(color: Color) {
        this.text += color;
        return this;
    }

    getText() {
        return this.text;
    }
}