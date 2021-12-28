const { Component } = window.Torus;
const html = window.jdom;

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Random page number for "Continued on Page..."
function R() {
  const MAX_PAGE = 30;
  return ~~(Math.random() * MAX_PAGE);
}

const debounce = (fn, delayMillis) => {
  let lastRun = 0;
  let to = null;
  return (...args) => {
    clearTimeout(to);
    const now = Date.now();
    const dfn = () => {
      lastRun = now;
      fn(...args);
    };
    if (now - lastRun > delayMillis) {
      dfn();
    } else {
      to = setTimeout(dfn, delayMillis);
    }
  };
};

function formatRelativeDate(timestamp) {
  if (!timestamp) {
    return "some time ago";
  }

  const date = new Date(timestamp);
  const delta = (Date.now() - date) / 1000;
  if (delta < 60) {
    return "< 1 min ago";
  } else if (delta < 3600) {
    return `${~~(delta / 60)} min ago`;
  } else if (delta < 86400) {
    return `${~~(delta / 3600)} hrs ago`;
  } else if (delta < 86400 * 2) {
    return "yesterday";
  } else if (delta < 86400 * 3) {
    return "2 days ago";
  } else {
    return date.toLocaleDateString();
  }
}

// for header top bar
function formatDate() {
  const date = new Date();
  return `${DAYS[date.getDay()]}, ${
    MONTHS[date.getMonth()]
  } ${date.getDate()}, ${date.getFullYear()}`;
}

// return list of writers as formatted string
function formatWriters(writers) {
  writer = writers[writers.length - 1];
  return writers.length > 1
    ? writers.slice(0, -1).join(", ") + " and " + writer
    : writer;
}

function decodeHTMLEntities(s) {
  const div = document.createElement("div");
  div.innerHTML = s;
  return div.textContent || div.innerText || "";
}

// fetch and normalize posts
async function fetchStory(id) {
  const resp = await fetch(
    `https://vanderbilthustler.com/wp-json/wp/v2/posts/${id}?_fields=date,title,content,link,featured_media,custom_fields.writer`
  )
    .then((r) => r.json())
    .then((j) => [j]) // put single story in array for compatibility
    .catch(console.error);
  console.log(resp);
  const stories = await Promise.all(
    // remove posts w/o featured image
    resp
      .filter((el) => el.featured_media)
      .map(async (el) => {
        const imglink = await fetchStoryImage(el.featured_media);
        const story = el;
        story.featured_media = imglink;
        return story;
      })
  );
  console.log(stories);
  return stories;
}

async function fetchStoryImage(id) {
  const resp = await fetch(
    `https://vanderbilthustler.com/wp-json/wp/v2/media/${id}?_fields=guid`
  )
    .then((r) => r.json())
    .catch(console.error);

  return resp.guid && resp.guid.rendered;
}

function StoryBody(created, text) {
  if (!text) {
    text = `Lorem ipsum dolor sit amet, ei mel cibo meliore instructior, eam te etiam clita. Id falli facilis intellegam his, eu populo dolorem offendit eam. Noster nemore luptatum ex sit. Ei sea melius definitiones.`;
  }

  // const words = text.split(" ");
  // if (words.length > 100) {
  //   return [
  //     html`<p>
  //       ${formatRelativeDate(created)}–${words.slice(0, 100).join(" ")} ...
  //     </p>`,
  //     html`<p class="continued"><em>Continued on Page A${R()}</em></p>`,
  //   ];
  // }
  let paras = text.replace("<p>", "").split("</p>");
  let ret = [html`<p>${formatRelativeDate(created)}–</p>`];
  for (para of paras) {
    ret.push(html`<p>${decodeHTMLEntities(para)}</p>`);
  }

  return ret;
}

// All stories that appear have the same DOM structure, displayed
// differently with CSS. This renders such a single story.
function Story(story) {
  if (!story) {
    return null;
  }

  const { title, custom_fields, link, content, featured_media, date } = story;
  return html`<div class="story">
    <a href="${link}" target="_blank">
      <h2 class="story-title">${decodeHTMLEntities(title.rendered)}</h2>
    </a>
    <div class="story-byline">
      By
      <span class="story-author">${formatWriters(custom_fields.writer)}</span>
    </div>
    ${featured_media
      ? html`<img
          class="story-image full-story-image"
          src="${featured_media}"
        />`
      : null}
    <div class="story-content full-story-content">
      ${StoryBody(date, content.rendered)}
    </div>
  </div>`;
}

class App extends Component {
  init() {
    this.stories = [];
    this._loading = false;

    this.resize = debounce(this.resize.bind(this), 500);
    window.addEventListener("resize", this.resize);

    this.fetch();
  }
  resize() {
    this.render();
  }
  async fetch() {
    this._loading = true;
    this.render();

    const urlParams = new URLSearchParams(window.location.search);
    const storyID = urlParams.get("id");

    this.stories = await fetchStory(storyID);

    this._loading = false;
    this.render();
  }
  compose() {
    const stories = this.stories.slice();

    const centerSpreads = stories.slice(0, 2);
    const leftSidebar = stories.slice(2, 6);
    const sidebarSpread = stories.slice(6, 9);
    const bottom = stories.slice(9, 12);
    const mini = stories.slice(12, 16);
    const mini2 = stories.slice(16, 21);
    const mini3 = stories.slice(21, 25);

    // Instead of having a responsive layout that wrecks the newspaper
    // feel, if the window is too small, we simply scale the entire
    // front page down appropriately. Here we compute that ratio
    // to leave a 2% margin on either side for visual comfort.
    const scale = Math.min((window.innerWidth / 1200) * 0.96, 1);

    const storiesSection = [
      html`<div class="main flex-row">
        <div class="left-sidebar flex-column smaller">
          ${leftSidebar.map(Story)}
        </div>
        <div class="spreads flex-column full-flex">
          <div class="top flex-row full-flex">
            <div class="center-spread full-story>${centerSpreads.map(
              Story
            )}</div>
            <div class="sidebar sidebar-spread flex-column smaller">
              ${sidebarSpread.map(Story)}
            </div>
          </div>
          <div class="bottom flex-row">${bottom.map(Story)}</div>
        </div>
      </div>`,
      html`<div class="mini flex-row smaller">${mini.map(Story)}</div>`,
      html`<div class="mini flex-row smaller">${mini2.map(Story)}</div>`,
      html`<div class="mini flex-row smaller">${mini3.map(Story)}</div>`,
    ];

    return html`<div
      class="app flex-column"
      style="transform: scale(${scale}) translate(-50%, 0)"
    >
      <header class="flex-column">
        <div class="header-main flex-row">
          <div class="header-tagline header-main-aside">
            "All the Hustler <br />
            That's Fit to Print"
          </div>
          <a href="/" class="masthead-link">
            <h1 class="fraktur masthead">The Vanderbilt Hustler</h1>
          </a>
          <div class="header-edition header-main-aside">
            <div class="header-edition-title">The Classic Edition</div>
            <p class="header-edition-body justify">
              This is
              <a href="https://vanderbilthustler.com" target="_blank">
                <strong>The Vanderbilt Hustler</strong></a
              >
              reimagined in the style of a certain well-known metropolitan
              newspaper. You're currently reading the 25 latest stories from the
              website.
            </p>
          </div>
        </div>
        <div class="header-bar flex-row">
          <div class="header-vol bar-aside">
            VOL. CLXX . . . No. ${Math.random() > 0.5 ? 3.14159 : 4.2069}
          </div>
          <div class="header-nyc">Nashville, ${formatDate()}</div>
          <div class="header-controls bar-aside flex-row"></div>
        </div>
      </header>
      ${this._loading
        ? html`<div class="loading">Loading stories...</div>`
        : storiesSection}
      <footer>
        <p>
          The Vanderbilt Hustler: Classic Edition is a project by
          <a target="_blank" href="https://aadibajpai.com">Aadi Bajpai</a>. It's
          built with
          <a target="_blank" href="https://github.com/thesephist/unim.press"
            >unim.press</a
          >
          and open source on GitHub at
          <a target="_blank" href="https://github.com/aadibajpai/hustler"
            >aadibajpai/hustler</a
          >.
        </p>
      </footer>
    </div>`;
  }
}

const app = new App();
document.body.appendChild(app.node);
