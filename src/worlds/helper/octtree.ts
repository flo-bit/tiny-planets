import * as THREE from 'three';

export type OcttreeOptions = {
	bounds?: THREE.Box3;

	size?: number;

	min?: THREE.Vector3;
	max?: THREE.Vector3;

	points?: THREE.Vector3[];

	capacity?: number;
};

export class Octtree {
	boundary: THREE.Box3;

	points: THREE.Vector3[];

	capacity: number;

	subdivisions: Octtree[] | undefined = undefined;

	constructor(opts: OcttreeOptions = {}) {
		opts ??= {};

		this.points = [];

		if (opts.bounds) {
			this.boundary = opts.bounds.clone();
		} else if (opts.size) {
			const s = opts.size;
			this.boundary = new THREE.Box3(new THREE.Vector3(-s, -s, -s), new THREE.Vector3(s, s, s));
		} else if (opts.min || opts.max) {
			const min = opts.min || new THREE.Vector3(-1, -1, -1);
			const max = opts.max || new THREE.Vector3(1, 1, 1);
			this.boundary = new THREE.Box3(min, max);
		} else if (opts.points && opts.points.length > 0) {
			const min = opts.points[0].clone();
			const max = opts.points[0].clone();
			for (const p of opts.points) {
				min.x = Math.min(min.x, p.x);
				min.y = Math.min(min.y, p.y);
				min.z = Math.min(min.z, p.z);

				max.x = Math.max(max.x, p.x);
				max.y = Math.max(max.y, p.y);
				max.z = Math.max(max.z, p.z);
			}
			this.boundary = new THREE.Box3(min, max);
		} else {
			this.boundary = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
		}

		this.capacity = opts.capacity || 4;

		if (opts.points) {
			for (const p of opts.points) {
				this.insertXYZ(p.x, p.y, p.z);
			}
		}
	}

	subdivide() {
		// if already subdivided exit silently
		if (this.subdivisions != undefined) return;

		// divide each dimension => 2 * 2 * 2 = 8 subdivisions
		const size = new THREE.Vector3();
		const subdivisions: Octtree[] = [];
		for (let x = 0; x < 2; x++) {
			for (let y = 0; y < 2; y++) {
				for (let z = 0; z < 2; z++) {
					const min = this.boundary.min.clone();
					const max = this.boundary.max.clone();
					this.boundary.getSize(size);
					size.divideScalar(2);

					min.x += x * size.x;
					min.y += y * size.y;
					min.z += z * size.z;
					max.x -= (1 - x) * size.x;
					max.y -= (1 - y) * size.y;
					max.z -= (1 - z) * size.z;

					subdivisions.push(
						new Octtree({
							min: min,
							max: max,
							capacity: this.capacity
						})
					);
				}
			}
		}
		this.subdivisions = subdivisions;
	}

	// returns array of points where
	// distance between pos and point is less than dist
	query(pos: THREE.Vector3, dist = 1) {
		const points = this.queryXYZ(pos.x, pos.y, pos.z, dist);
		for (let i = points.length - 1; i >= 0; i--) {
			if (points[i].distanceTo(pos) > dist) points.splice(i, 1);
		}
		return points;
	}

	// vector3 free version, returns points in box around xyz
	queryXYZ(x: number, y: number, z: number, s: number) {
		const min = new THREE.Vector3(x - s, y - s, z - s),
			max = new THREE.Vector3(x + s, y + s, z + s);
		const box = new THREE.Box3(min, max);

		return this.queryBox(box);
	}

	queryBox(box: THREE.Box3, found: THREE.Vector3[] = []) {
		found ??= [];

		if (!box.intersectsBox(this.boundary)) return found;

		for (const p of this.points) {
			if (box.containsPoint(p)) found.push(p);
		}
		if (this.subdivisions) {
			for (const sub of this.subdivisions) {
				sub.queryBox(box, found);
			}
		}
		return found;
	}

	// returns true if no points are closer than dist to point
	minDist(pos: THREE.Vector3, dist: number) {
		return this.query(pos, dist).length < 1;
	}

	// insert point with optional data (sets vec.data = data)
	insert(pos: THREE.Vector3, data: unknown = undefined) {
		return this.insertPoint(pos, data);
	}
	// vector3 free version
	insertXYZ(x: number, y: number, z: number, data: unknown = undefined) {
		return this.insertPoint(new THREE.Vector3(x, y, z), data);
	}
	insertPoint(p: THREE.Vector3, data: unknown = undefined) {
		p = p.clone();

		// @ts-expect-error - data is not a property of Vector3
		if (data) p.data = data;

		if (!this.boundary.containsPoint(p)) return false;

		if (this.points.length < this.capacity) {
			this.points.push(p);
			return true;
		} else {
			this.subdivide();
			let added = false;
			for (const sub of this.subdivisions ?? []) {
				if (sub.insertPoint(p, data)) added = true;
			}
			return added;
		}
	}

	showBoxes(mat: THREE.Material, parent: THREE.Object3D | undefined = undefined) {
		const size = new THREE.Vector3();
		this.boundary.getSize(size);

		const box = new THREE.BoxGeometry(size.x * 2, size.y * 2, size.z * 2);
		const mesh = new THREE.Mesh(
			box,
			mat ||
				new THREE.MeshStandardMaterial({
					wireframe: true
				})
		);
		this.boundary.getCenter(mesh.position);

		parent ??= new THREE.Object3D();
		parent.add(mesh);

		if (this.subdivisions) {
			for (const sub of this.subdivisions) sub.showBoxes(mat, parent);
		}
		return parent;
	}

	show(
		opts: {
			pointsOnly?: boolean;
			mat?: THREE.Material;
			size?: number;
			sizeAttenuation?: boolean;
			p?: THREE.Vector3;
			min?: number;
		} = {}
	) {
		opts ??= {};

		const pointsOnly = opts.pointsOnly;
		let mat = opts.mat;
		const points = this.all();

		const pointsGeo = new THREE.BufferGeometry();
		const positionData = new Float32Array(points.length * 3);
		const colorData = new Float32Array(points.length * 3);

		let q;

		if (opts.p && opts.min) {
			for (const point of points) {
				// @ts-expect-error - close is not a property of Vector3
				point.close = false;
			}
			q = this.query(opts.p, opts.min);

			for (const point of q) {
				// @ts-expect-error - close is not a property of Vector3
				point.close = true;
			}
		}

		for (let i = 0; i < points.length; i++) {
			positionData[i * 3] = points[i].x;
			positionData[i * 3 + 1] = points[i].y;
			positionData[i * 3 + 2] = points[i].z;

			// @ts-expect-error - close is not a property of Vector3
			colorData[i * 3] = points[i].close ? 1 : 0.7;

			// @ts-expect-error - close is not a property of Vector3
			colorData[i * 3 + 1] = points[i].close ? 0 : 0.7;

			// @ts-expect-error - close is not a property of Vector3
			colorData[i * 3 + 2] = points[i].close ? 0 : 0.7;
		}
		pointsGeo.setAttribute('position', new THREE.BufferAttribute(positionData, 3));
		pointsGeo.setAttribute('color', new THREE.BufferAttribute(colorData, 3));
		const pointMesh = new THREE.Points(
			pointsGeo,
			new THREE.PointsMaterial({
				size: opts.size || 1,
				sizeAttenuation: opts.sizeAttenuation || false,
				vertexColors: true
			})
		);
		if (pointsOnly) return pointMesh;

		mat =
			mat ||
			new THREE.MeshStandardMaterial({
				transparent: true,
				opacity: 0.01,
				depthTest: false
			});
		const boxes = this.showBoxes(mat);
		boxes.add(pointMesh);
		return boxes;
	}

	all(arr: THREE.Vector3[] = []) {
		arr ??= [];
		for (const p of this.points) {
			arr.push(p);
		}
		if (this.subdivisions) {
			for (const subs of this.subdivisions) subs.all(arr);
		}
		return arr;
	}
}
