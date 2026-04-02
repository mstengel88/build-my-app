import{e as i}from"./index-CIoP5987.js";import{t as a,c as r}from"./en-US-t5YSDIAT.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=i("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]);function h(n,t){const e=a(n);if(isNaN(t))return r(n,NaN);if(!t)return e;const s=e.getDate(),o=r(n,e.getTime());o.setMonth(e.getMonth()+t+1,0);const c=o.getDate();return s>=c?o:(e.setFullYear(o.getFullYear(),o.getMonth(),s),e)}function l(n){const t=a(n);return t.setDate(1),t.setHours(0,0,0,0),t}export{g as F,h as a,l as s};
