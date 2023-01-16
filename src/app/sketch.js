import * as THREE from 'three';
import { OrbitControls } from '../libs/OrbitControls';
import testVert from './shader/test.vert.glsl';
import testFrag from './shader/test.frag.glsl';
import { resizeRendererToDisplaySize } from '../libs/three-utils';
import { fromEvent } from 'rxjs';
import { mat4, quat, vec3 } from 'gl-matrix';
import { quatUtil } from './utils/quat-util';
import { Object3D } from 'three';
import { SecondOrderSystemQuaternion } from './utils/second-order-quaternion';
import { SecondOrderSystemValues } from './utils/second-order-system';

// the target duration of one frame in milliseconds
const TARGET_FRAME_DURATION = 16;

// total time
var time = 0; 

// duration betweent the previous and the current animation frame
var deltaTime = 0; 

// total framecount according to the target frame duration
var frames = 0; 

// relative frames according to the target frame duration (1 = 60 fps)
// gets smaller with higher framerates --> use to adapt animation timing
var deltaFrames = 0;

const settings = {
}

// module variables
var _isDev, _pane, camera, scene, renderer, controls, mesh;
var targetObj, posTargetMesh;

const targetOrientation = quat.create();
const lookAtOrientation = quat.create();
const targetPosition = vec3.create();
var soq = new SecondOrderSystemQuaternion(1, .6, 0.9, targetOrientation);
var sop = new SecondOrderSystemValues(1, 0.6, 0.9, targetPosition);

function init(canvas, onInit = null, isDev = false, pane = null) {
    _isDev = isDev;
    _pane = pane;

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
    camera.position.z = 1;

    scene = new THREE.Scene();

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            uTime: { value: 1.0 },
		    uResolution: { value: new THREE.Vector2() }
        },
        vertexShader: testVert,
        fragmentShader: testFrag,
        glslVersion: THREE.GLSL3
    });
    mesh = new THREE.Mesh( geometry, material );
    mesh.onBeforeRender = () => {
        mesh.material.uniforms.uTime.value = time;
    }
    scene.add( mesh );

    const targetGeo = new THREE.SphereGeometry(0.02);
    const targetMesh = new THREE.Mesh( targetGeo, new THREE.MeshBasicMaterial({color: '#ffffff'}));
    targetMesh.position.z += .5;
    targetObj = new Object3D();
    targetObj.add(targetMesh);
    scene.add(targetObj);

    const posTargetGeo = new THREE.SphereGeometry(0.01);
    posTargetMesh = new THREE.Mesh( posTargetGeo, new THREE.MeshBasicMaterial({color: '#ff0000'}));
    scene.add(posTargetMesh);

    const axesHelper = new THREE.AxesHelper( 5 );
    scene.add( axesHelper );    

    renderer = new THREE.WebGLRenderer( { canvas, antialias: true } );
    document.body.appendChild( renderer.domElement );

    controls = new OrbitControls( camera, renderer.domElement );
    controls.update();

    fromEvent(renderer.domElement, 'pointerdown').subscribe(() => {
        quat.random(targetOrientation);
        const target = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 0, -.5), targetOrientation);
        const rot = mat4.targetTo(mat4.create(), vec3.create(), target, vec3.fromValues(0, 1, 0));
        mat4.getRotation(lookAtOrientation, rot);

        vec3.set(targetPosition, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
        vec3.scale(targetPosition, targetPosition, 0.3);

        vec3.copy(targetPosition, vec3.scale(target, target, -1));
    });

    if (onInit) onInit(this);
    
    resize();
}

function run(t = 0) {
    deltaTime = Math.min(TARGET_FRAME_DURATION, t - time);
    time = t;
    deltaFrames = deltaTime / TARGET_FRAME_DURATION;
    frames += deltaFrames;

    animate();
    render();

    requestAnimationFrame((t) => run(t));
}

function resize() {
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
}

function animate() {
    controls.update();

    targetObj.quaternion.fromArray(targetOrientation);


    const dt = (deltaTime + 1) * 0.001;
    
    /*const currentOrientation = mesh.quaternion.clone().toArray();
    const angularVelocity = quatUtil.differentiateAngularVelocityApprox(vec3.create(), targetOrientation, currentOrientation, dt);
    vec3.scale(angularVelocity, angularVelocity, 0.1);
    const newOrientation = quatUtil.integrateAngularVelocityApprox(quat.create(), angularVelocity, currentOrientation, dt);
    mesh.quaternion.fromArray(newOrientation);*/

    soq.updateApprox(dt, lookAtOrientation);
    mesh.quaternion.fromArray(soq.value);

    sop.update(dt, targetPosition);
    posTargetMesh.position.fromArray(sop.values);

    //mesh.quaternion.slerp(targetObj.quaternion, 0.1);
}

function render() {
    renderer.render( scene, camera );
}

export default {
    init,
    run,
    resize
}