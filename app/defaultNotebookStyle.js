const style = `
*, ::before, ::after {
  box-sizing: border-box;
}
body {
  color: hsla(204, 33%, 97%, 1);
  background-color: hsla(206, 24%, 21%, 1);
  background-image: repeating-linear-gradient( -45deg, black, black 1px, transparent 1px, transparent 6px );
  background-size: 4px 4px;
  font-family: arial, sans-serif;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.28581;
  text-transform: none;
  text-size-adjust: 100%;
}
#notebook {
  width: 100vw;
  display: flex;
  justify-content: start;
  align-content: flex-start;
  align-items: stretch;
  box-sizing: border-box;
  flex-wrap: wrap;
  padding: 0;
  overflow-y: none;
  scroll-behavior: smooth;
}
.notecard {
  flex: 1 1 0;
  margin: 5px;
  font-size: 14px;
  min-width: 220px;
  width: 220px;
  max-width: 220px;
  min-height: 240px;
  box-shadow: 0 0 0 1px rgba(16, 22, 26, 0.2), 0 1px 1px rgba(16, 22, 26, 0.4), 0 2px 6px rgba(16, 22, 26, 0.4);
  background-color: #30404d;
  border-radius: 3px;
  transition: transform 200ms cubic-bezier(0.4, 1, 0.75, 0.9), box-shadow 200ms cubic-bezier(0.4, 1, 0.75, 0.9), -webkit-transform 200ms cubic-bezier(0.4, 1, 0.75, 0.9), -webkit-box-shadow 200ms cubic-bezier(0.4, 1, 0.75, 0.9);
}
.notecard-title {
  font-size: 16px;
  width: 100%;
  background: #357cc5;
  font-weight: bolder;
  padding: 5px;
  padding-left: 8px;
  position: sticky;
  top: 0;
  display: flex;
  z-index: 1;
  margin: 0;
  overflow: hidden;
  line-height: 20px;
}
.notecard-content {
  height: calc(100% - 30px);
  min-height: calc(100% - 30px);
  padding: 5px;
  word-wrap: break-word;
  width: 220px;
}
h2 {
  font-size: 16px;
  line-height: 20px;
  min-height: 34px;
  margin: 10px -5px;
  padding: 7px;
  border-bottom: 1px solid hsl(206, 24%, 64%);
  width: calc(100% + 10px);
  min-width: calc(100% + 10px);
  text-align: left;
}
h6 {
  font-size: 30px;
  text-align: center;
}
p {
  margin-top: 4px;
  margin-bottom: 8px;
}
a {
  color: #92f8e6 !important;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
ul {
  display: block;
  list-style-type: disc;
  margin-block-start: 1em;
  margin-block-end: 1em;
  margin-inline-start: 0px;
  margin-inline-end: 0px;
  padding-inline-start: 40px;
  padding: 0;
  margin-left: 20px;
  margin-top: 10px;
  color: hsla(204, 33%, 97%, 1);
}
ul ul {
  list-style-type: circle;
  margin-block-start: 0px;
  margin-block-end: 0px;
}
ul li {
  color: #92f8e6;
}
ul li p {
  color: hsla(204, 33%, 97%, 1) !important;
}
ol {
  padding: 0;
  margin-left: 15px;
  margin-top: 10px;
}
ol li {
  color: #92f8e6;
}
ol li p {
  color: hsla(204, 33%, 97%, 1) !important;
}
table {
  width: calc(100% + 12px);
  border-collapse: collapse;
  margin: 5px -6px;
  font-size: 14px;
}
th {
  text-align: center;
  font-weight: normal;
  width: 50%;
  padding: 5px 2px;
}
th:not(:first-child) {
  border-left: 1px solid hsl(206, 24%, 64%);
}
tbody tr {
  border-top: 1px solid hsl(206, 24%, 64%);
}
td {
  padding: 0;
  padding-left: 5px;
  text-align: left;
}
td:not(:first-child) {
  border-left: 1px solid hsl(206, 24%, 64%);
}
.metadata {
  border-collapse: separate !important;
  border-spacing: 0 5px;
  width: calc(100% + 9px) !important;
  margin-left: -4px !important;
}
.metadata p {
  margin: 0;
}
.metadata td {
  padding: 5px 5px;
}
.metadata td:nth-child(1) {
  background-color: #394b59;
  background-image: linear-gradient( 180deg, hsla(0, 0%, 100%, 0.05), hsla(0, 0%, 100%, 0) );
  box-shadow: 0 0 0 1px rgba(16, 22, 26, 0.4);
  border-radius: 3px 0 0 3px;
  color: #f5f8fa;
  text-align: left;
  padding-right: 5px;
  min-width: 30px;
  width: 30px;
  max-width: 120px;
}
.metadata td:nth-child(2) {
    background-color: rgba(16, 22, 26, 0.3);
    box-shadow: 0 0 0 0 rgba(19, 124, 189, 0), 0 0 0 0 rgba(19, 124, 189, 0), 0 0 0 0 rgba(19, 124, 189, 0), inset 0 0 0 1px rgba(16, 22, 26, 0.3), inset 0 1px 1px rgba(16, 22, 26, 0.4);
    word-break: break-all;
    text-align: right;
    padding-right: 5px;
    border-left: none;
}
img {
  width: auto;
  margin: 5px -5px;
  display: block;
  position: relative;
  min-height: 18px;
}
blockquote {
  border-left: 1px solid hsl(206, 24%, 64%);
  font-style: italic;
  line-height: 1.5em;
  margin: 0;
  margin-left: 5px;
  white-space: pre-line;
  padding: 0;
  padding-left: 10px;
  position: relative;
}
blockquote::before {
  content: '';
  position: absolute;
  top: 50%;
  background-color: #30404d;
  height: 2.4em;
  left: -4px;
  width: 5px;
  margin-top: -1.2em;
}
blockquote::after {
  content: url("data:image/svg+xml; utf8, <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="%238da6b9" d="M464 32H336c-26.5 0-48 21.5-48 48v128c0 26.5 21.5 48 48 48h80v64c0 35.3-28.7 64-64 64h-8c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h8c88.4 0 160-71.6 160-160V80c0-26.5-21.5-48-48-48zm-288 0H48C21.5 32 0 53.5 0 80v128c0 26.5 21.5 48 48 48h80v64c0 35.3-28.7 64-64 64h-8c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h8c88.4 0 160-71.6 160-160V80c0-26.5-21.5-48-48-48z"></path></svg>");
  position: absolute;
  top: 50%;
  color: hsl(206, 24%, 64%);
  font-size: 8px;
  font-weight: 900;
  line-height: 1em;
  left: -0.5em;
  text-align: center;
  text-indent: -2px;
  width: 1em;
  margin-top: -0.5em;
}
hr {
  box-sizing: content-box;
  height: 0;
  overflow: visible;
  background-image: linear-gradient(to right, hsl(206, 24%, 64%) 50%, rgba(255,255,255,0) 0%);
  background-position: bottom;
  background-size: 20px 1px;
  background-repeat: repeat-x;
  margin-left: -5px;
  margin-right: -5px;
  margin-top: 0;
  margin-bottom: 0;
}
@media print {
  body {
    background-color: white;
    background-image: none;
  }
  #notebook {
    width: 710px;
    margin: 0 auto;
    overflow-x: hidden;
    overflow-y: hidden;
  }
}
`;

export default style;
