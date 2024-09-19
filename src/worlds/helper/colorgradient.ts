import { Color } from 'three';

const noColor = new Color(0xff00cc);

export type ColorGradientOptions =
	| {
			between?: ColorGradientBetweenOptions;
			min?: number;
			max?: number;
			stops?: ColorGradientStopOptions[];
			hsl?: boolean;
			mod?: ModifierFunction;
	  }
	| [number, number][];

type ModifierFunction = ((number: number) => number) | undefined;

type ColorGradientStop = {
	position: number;
	value: Color | ColorGradient;
	mod: ModifierFunction;
};

type ColorGradientBetweenOptions = (number | Color | ColorGradient | ColorGradientOptions)[];

type ColorGradientStopOptions =
	| ColorGradientStop
	| [number, number | Color | ColorGradient | ColorGradientOptions]
	| [number, number | Color | ColorGradient | ColorGradientOptions, ModifierFunction];

export class ColorGradient {
	stops: ColorGradientStop[];
	hsl: boolean = false;

	isColorGradient: boolean = true;

	defaultMod: ModifierFunction = undefined;

	constructor(opts: ColorGradientOptions = {}) {
		this.stops = [];

		if (opts instanceof Array) opts = { stops: opts };

		this.hsl = opts.hsl ?? false;

		this.defaultMod = opts.mod;

		if (opts.between) this.addBetween(opts.between, opts.min, opts.max);
		if (opts.stops) this.addStops(opts.stops);
	}

	addStops(arr: ColorGradientStopOptions[]) {
		for (const s of arr) {
			this.addStop(s);
		}
	}

	// add stops in even spacing between min and max
	addBetween(arr: ColorGradientBetweenOptions, min: number = -1, max: number = 1) {
		if (arr.length < 2) console.warn('ColorGradient: addBetween requires at least 2 stops');

		const step = (max - min) / (arr.length - 1);
		for (let i = 0; i < arr.length; i++) {
			this.addStop([i * step + min, arr[i]]);
		}
	}

	addStop(stop: ColorGradientStopOptions) {
		let pos, mixObject, mod;

		if (stop instanceof Array) {
			pos = stop[0];
			mixObject = stop[1];
			if (stop.length > 2) mod = stop[2];
		} else {
			pos = stop.position;
			mixObject = stop.value;
			mod = stop.mod;
		}

		if (typeof mixObject == 'number') {
			mixObject = new Color(mixObject);
		} else if (!(mixObject instanceof Color) && !(mixObject instanceof ColorGradient)) {
			mixObject = new ColorGradient(mixObject);
		}

		let i = 0;
		while (i < this.stops.length && pos > this.stops[i].position) i++;

		this.stops.splice(i, 0, {
			position: pos,
			value: mixObject,
			mod: mod
		});
	}

	/**
	 * get the color at a specific index
	 *
	 * @param i - index of the color
	 * @param y
	 * @param z
	 * @param w
	 * @returns
	 */
	colorAtIndex(
		i: number,
		y: number | undefined = undefined,
		z: number | undefined = undefined,
		w: number | undefined = undefined
	): Color | undefined {
		if (i < 0 || i >= this.stops.length) return;

		let c = this.stops[i].value;
		if (c instanceof ColorGradient) {
			c = c.get(y, z, w);
		} else {
			c = c.clone();
		}
		return c;
	}

	dimensions() {
		let maxD = 0;
		for (const s of this.stops) {
			if (s.value instanceof ColorGradient) {
				maxD = Math.max(s.value.dimensions(), maxD);
			}
		}
		return maxD + 1;
	}

	/**
	 * mix between two colors at a specific index
	 *
	 * @param i - index of the first color
	 * @param j - index of the second color
	 * @param amt - amount to mix between the two colors (0-1)
	 * @param y
	 * @param z
	 * @param w
	 * @returns the mixed color
	 */
	mix(
		i: number,
		j: number,
		amt: number,
		y: number | undefined = undefined,
		z: number | undefined = undefined,
		w: number | undefined = undefined
	): Color | undefined {
		if (i < 0 || i >= this.stops.length || j < 0 || j >= this.stops.length) return;

		amt = Math.min(Math.max(0, amt), 1);

		const firstColor = this.colorAtIndex(i, y, z, w);
		if (!firstColor) return;

		if (i == j) return firstColor;

		const stop = this.stops[j];
		if (stop.mod) {
			amt = stop.mod(amt);
		}
		if (this.defaultMod) {
			amt = this.defaultMod(amt);
		}

		const secondColor = this.colorAtIndex(j, y, z, w);
		if (!secondColor) return firstColor;

		if (this.hsl) firstColor.lerpHSL(secondColor, amt);
		else firstColor.lerp(secondColor, amt);

		return firstColor;
	}

	get(
		x: number = 0,
		y: number | undefined = undefined,
		z: number | undefined = undefined,
		w: number | undefined = undefined
	): Color {
		if (this.stops.length < 1) return noColor;

		if (x <= this.stops[0].position || this.stops.length == 1)
			return this.mix(0, 0, 0, y, z, w) ?? noColor;

		for (let i = 0; i < this.stops.length - 1; i++) {
			const s1 = this.stops[i].position,
				s2 = this.stops[i + 1].position;
			if (s1 <= x && x <= s2) {
				const amt = (x - s1) / (s2 - s1);
				return this.mix(i, i + 1, amt, y, z, w) ?? noColor;
			}
		}
		return this.mix(this.stops.length - 1, this.stops.length - 1, 0, y, z, w) ?? noColor;
	}

	static between(arr: ColorGradientBetweenOptions, min: number, max: number) {
		return new ColorGradient({
			between: arr,
			min: min,
			max: max
		});
	}
}
