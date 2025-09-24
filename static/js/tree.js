// ---------------COOKIE BACKEND SETUP ---------------
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString(); // Corrected date calculation
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}

function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

let userId; // Declare userId globally

// ---------------COOKIE BACKEND SETUP ---------------

// INITIALIZE ID COUNTER
let idCounter = 0; // This will be updated after loading data

// ALL DATA
let data = {
  name: "All Trees",
  children: [],
};

function getMaxId(node) {
  let maxId = node.id || 0;
  if (node.children) {
    node.children.forEach((child) => {
      maxId = Math.max(maxId, getMaxId(child));
    });
  }
  return maxId;
}

// NODE DATA STRUCTURE
function createNode(name, type = "leaf", parent = null) {
  const newNode = {
    id: idCounter++,
    name,
    type,
    notes: "",
    parent,
    children: [],
    color: "",
    isNew: true,
  };
  return newNode;
}

function createRootNode(name) {
  const rootNode = createNode(name, "root", data);
  return rootNode;
}

function findNodeById(node, id) {
  if (node.id === id) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}
const spacingBetweenTrees = 2000;
let currentPanX = 0; // global variable to track current pan amount

function addNewTree() {
  const newRoot = createRootNode(`Tree ${data.children.length + 1}`);
  data.children.push(newRoot);

  if (data.children.length === 1) {
    // First tree added — reset pan
    currentPanX = 0;

    // Reset zoom/pan to original (no pan)
    svg.transition().duration(800).call(zoom.transform, d3.zoomIdentity);
  } else {
    // Subsequent trees — pan right
    currentPanX -= spacingBetweenTrees;

    const targetX = currentPanX;
    const targetY = 0;

    const newTransform = d3.zoomIdentity.translate(targetX, targetY).scale(1);

    svg.transition().duration(800).call(zoom.transform, newTransform);
  }

  treeRender();

  // No need to get currentTreeData again, it's already updated globally
  saveTreeData(data);
}

function deleteNode(id) {
  const node = findNodeById(data, id);
  if (!node) return;

  // Recursively delete all children first
  if (node.children && node.children.length > 0) {
    // Copy array to avoid mutation issues during recursion
    const childrenCopy = [...node.children];
    for (const child of childrenCopy) {
      deleteNode(child.id);
    }
  }

  const parent = node.parent;

  if (parent && parent.children) {
    // Find index and remove node from parent's children array
    const index = parent.children.findIndex((child) => child.id === id);
    if (index !== -1) {
      parent.children.splice(index, 1);
    }
  } else {
    // If no parent, remove from root data.children
    const index = data.children.findIndex((child) => child.id === id);
    if (index !== -1) {
      data.children.splice(index, 1);
    }
  }

  // Reset currentNode & hide menu if the deleted node was current
  if (currentNode) {
    const currentDatum = d3.select(currentNode).datum();
    if (currentDatum.data.id === id) {
      currentNode = null;
      hideMenu();
    }
  }

  treeRender();

  // No need to get currentTreeData again, it's already updated globally
  saveTreeData(data);
}

function getCurrentTreeData() {
  return data;
}

// Renamed and modified to accept loaded data or fetch if none
async function loadTreeDataAndRender() {
  const response = await fetch(`/get_tree?userId=${userId}`);
  const result = await response.json();

  if (!result.data || result.data.children.length === 0) {
    console.log("No tree data found for user, creating initial tree.");
    // If no data, initialize with one tree
    const root1 = createRootNode("Tree 1");
    data.children.push(root1);
    // Update idCounter based on the newly created node
    idCounter = getMaxId(data) + 1;
    saveTreeData(data); // Save the newly created tree
  } else {
    const treeData = result.data;
    data.name = treeData.name;
    data.children = treeData.children || [];
    restoreParentReferences(data);
    // Update idCounter to avoid collisions with loaded data
    idCounter = getMaxId(data) + 1;
    console.log("Tree data loaded for user. Max ID:", idCounter - 1);
  }

  treeRender();
  currentNode = null;
  hideMenu();
}

function restoreParentReferences(node, parent = null) {
  node.parent = parent;
  if (node.children) {
    node.children.forEach((child) => restoreParentReferences(child, node));
  }
}

// Renamed to be more specific, as saveNote already exists
async function saveNoteContent(content) {
  try {
    const res = await fetch("/save_note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, userId }),
    });
    const result = await res.json();
    console.log(result.message);
  } catch (error) {
    console.error("Error saving note: ", error);
  }
}

// ---------------DATA STRUCTURE SETUP ---------------
// Moved initial tree creation inside loadTreeDataAndRender to handle existing data

// --------------- JSON print setup ---------------
function safeTreeView(node) {
  // Check if node is null or undefined before accessing properties
  if (!node) return null;

  const copy = {
    id: node.id,
    name: node.name,
    type: node.type,
    notes: node.notes,
    progress: node.progress,
    // Recursively call safeTreeView only if node.children exists and is an array
    children:
      node.children && Array.isArray(node.children)
        ? node.children.map(safeTreeView)
        : [],
  };
  return copy;
}
// Console log removed from global scope to avoid initial empty log
// console.log(JSON.stringify(safeTreeView(data), null, 2));
// --------------- JSON print setup ---------------

// --------------- SVG setup---------------

const width = window.innerWidth * 0.9;
const height = window.innerHeight * 0.9;
const radius = Math.min(width, height) / 2;

const nodeMenuWidth = 20;
const nodeMenuHeight = 50;

const nodeMenuItemWidth = 10;
const nodeMenuItemHeight = 20;

// All D3 selections should be done after DOMContentLoaded to ensure elements exist
let svg,
  colormenu,
  colormenuitem,
  colormenubutton,
  colormenuyellow,
  colormenured,
  colormenuorange,
  colormenugreen,
  colormenubrown,
  nodemenu,
  nodemenuitem,
  editmenuitem,
  addmenuitem,
  deletemenuitem,
  newtreebutton,
  notepadbutton,
  container,
  zoom,
  quill;

let lastTransform = d3.zoomIdentity;

const xScale = 1.2;
const yScale = 0.7;

function radialPoint(angle, radius) {
  const x = radius * Math.cos(angle - Math.PI / 2) * xScale;
  const y = radius * Math.sin(angle - Math.PI / 2) * yScale;
  return [x, y];
}

function getOriginalFill(d) {
  if (d.data.color) {
    return d.data.color;
  }
  if (d.depth === 0) {
    return "#160306"; // root color
  } else if (!d.children || d.children.length === 0) {
    // Check for actual leaf
    return "#7ebd78"; // leaf color
  } else {
    return "#310910"; // branch color
  }
}

function showMenu(nodeElement, d) {
  // find node's absolute position on the page
  const nodebbox = nodeElement.getBoundingClientRect();
  // this is the position relative to the svg box (which is how the nodes are drawn)
  const svgbox = svg.node().getBoundingClientRect();

  const left = nodebbox.left + 150;
  const top = nodebbox.top + 200;

  nodemenu
    .style("left", left + "px")
    .style("top", top + "px")
    .style("display", "block")
    .style("color", "#111");
}

// Hide menu function
function hideMenu() {
  nodemenu.style("display", "none");
}

function showColorMenu(nodeElement, d) {
  // find node's absolute position on the page
  const nodebbox = nodeElement.getBoundingClientRect();
  // this is the position relative to the svg box (which is how the nodes are drawn)
  const svgbox = svg.node().getBoundingClientRect();

  const left = nodebbox.left + svgbox.left;
  const top = nodebbox.top + svgbox.top;

  colormenu
    .style("left", left + 75 + "px")
    .style("top", top + 100 + "px")
    .style("display", "flex");
}

function hideColorMenu() {
  colormenu.style("display", "none");
}

function colorChange(nodeDatum, color) {
  const node = findNodeById(data, nodeDatum.id);
  if (node) {
    node.color = color;
  }
  treeRender();
  saveTreeData(data); // Save updated data
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

const debouncedSave = debounce(saveNoteContent, 500);
let notesForm; // Will be selected in DOMContentLoaded
let notesVisible = false;

function openNotesMenu(element) {
  const nodebbox = element.getBoundingClientRect();
  const left = nodebbox.left;
  const top = nodebbox.top;
  const height = nodebbox.height;

  notesForm.style("top", top + height + "px");
  notesForm.style("left", left + 100 + "px");

  if (!notesVisible) {
    notesForm.style("display", "block");
    notesVisible = true;

    // === DRAGGABLE LOGIC ===
    let isMouseDown = false;
    let offsetX = 0;
    let offsetY = 0;

    d3.select(".ql-toolbar").on("mouseover", function () {
      notesForm.style("cursor", "move");
    });
    d3.select(".ql-toolbar").on("mousedown", function (event) {
      isMouseDown = true;
      offsetX = event.clientX - notesForm.node().offsetLeft;
      offsetY = event.clientY - notesForm.node().offsetTop;
      notesForm.style("cursor", "move");
      event.preventDefault(); // Prevent text selection
    });

    d3.select(document).on("mouseup", function () {
      isMouseDown = false;
      notesForm.style("cursor", "default");
    });

    d3.select(document).on("mousemove", function (event) {
      if (!isMouseDown) return;
      notesForm.style("left", event.clientX - offsetX + "px");
      notesForm.style("top", event.clientY - offsetY + "px");
    });
  } else {
    notesForm.style("display", "none");
    notesVisible = false;
    saveNoteContent(quill.root.innerHTML);
  }
}

async function saveTreeData(treeRoot) {
  try {
    const safeCopy = safeTreeView(treeRoot); // create safe copy

    const response = await fetch("/save_tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, treeData: safeCopy }), // send safeCopy here
    });

    const result = await response.json();
    console.log("Tree saved:", result.message);
  } catch (error) {
    console.error("Error saving tree:", error);
  }
}

function unhoverCurrentNode() {
  if (currentNode) {
    const d = d3.select(currentNode).datum();
    const originalFill = getOriginalFill(d);
    d3.select(currentNode)
      .interrupt()
      .transition()
      .duration(100)
      .attr("fill", originalFill);
    currentNode = null;
  }
}

function checkAndHideAll() {
  if (!menuHovered && !colormenuHovered && !nodeHovered) {
    hideMenu();
    hideColorMenu();
    unhoverCurrentNode();
  }
}

let menuHovered = false;
let nodeHovered = false;
let nodeClicked = false;
let currentNode = null;
let brightenedNodes = new Set();

// ---------------- MAIN TREE RENDER FUNCTION--------------------
function treeRender() {
  console.log("Rendering trees, count:", data.children.length);

  // Clear existing content in the container before rendering
  container.selectAll("*").remove();

  if (data.children.length === 0) {
    hideMenu();
    return;
  }

  const treeLayout = d3
    .tree()
    .size([2 * Math.PI, radius - 200])
    .separation((a, b) => (a.parent === b.parent ? 9 : 12));

  data.children.forEach((dataTree, index) => {
    const tree = d3.hierarchy(dataTree);
    treeLayout(tree);

    tree.descendants().forEach((d) => {
      d.y = d.depth * 120 + d.depth ** 2 * 15; // adjust radial radius
    });

    const treeGroup = container
      .append("g") // Use append directly as we are clearing all content each time
      .attr("class", `tree-group tree-group-${index}`)
      .attr(
        "transform",
        `translate(${index * spacingBetweenTrees + width / 2},${height / 2})`
      );

    // Draw links inside this group
    treeGroup
      .selectAll("path.link")
      .data(tree.links())
      .join("path")
      .attr("class", "link")
      .attr("d", (d) => {
        const [sx, sy] = radialPoint(d.source.x, d.source.y);
        const [tx, ty] = radialPoint(d.target.x, d.target.y);
        return `M${sx},${sy}L${tx},${ty}`;
      })
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-width", 2);

    // Draw nodes inside this group
    treeGroup
      .selectAll("circle.node")
      .data(tree.descendants(), (d) => d.data.id)
      .join("circle")
      .attr("class", "node")
      .attr("id", (d) => `node-${d.data.id}`)
      .attr("transform", (d) => {
        const [x, y] = radialPoint(d.x, d.y);
        return `translate(${x},${y})`;
      })
      .attr("r", (d) =>
        d.depth === 0 ? 50 : !d.children || d.children.length === 0 ? 25 : 40
      )
      .attr("fill", (d) => getOriginalFill(d))
      .attr("stroke", "#111")
      .attr("stroke-width", 2);

    // Draw labels inside this group
    treeGroup
      .selectAll("foreignObject.editable-label")
      .data(tree.descendants(), (d) => d.data.id)
      .join("foreignObject")
      .attr("class", "editable-label")
      .attr("x", (d) => {
        const [x, y] = radialPoint(d.x, d.y);
        const r =
          d.depth === 0 ? 50 : !d.children || d.children.length === 0 ? 25 : 40;
        return x + r;
      })
      .attr("y", (d) => {
        const [x, y] = radialPoint(d.x, d.y);
        const r =
          d.depth === 0 ? 50 : !d.children || d.children.length === 0 ? 25 : 40;
        return y - r;
      })
      .attr("width", 150)
      .attr("height", 40)
      .html(
        (d) =>
          `<textarea class="tree-label-textarea"
        style="
          width: 60px;
          height: 30px;
          font-family: monospace;
          font-weight: bold;
          font-size: ${
            d.depth === 0
              ? 16
              : !d.children || d.children.length === 0
              ? 10
              : 12
          }px;
          resize: none;
          text-transform: uppercase;
          border: none;
          background: transparent;
          color: inherit;
          overflow: hidden;
          outline: none;
          cursor: text;"
      >${d.data.name}</textarea>`
      )
      .each(function (d) {
        const textarea = d3.select(this).select("textarea");

        // 📝 **On input: update data**
        textarea.on("input", function (event) {
          d.data.name = this.value;
        });

        // 📝 **On keydown: Enter saves + blurs**
        textarea.on("keydown", function (event) {
          if (event.key === "Enter") {
            event.preventDefault(); // prevent newline
            this.blur();
          }
        });

        textarea.on("blur", function () {
          saveTreeData(data); // Save the entire data object
        });

        // 📝 **On double click: focus for editing**
        textarea.on("dblclick", function () {
          this.focus();
        });

        // ✅ **Autofocus if newly created node**
        if (d.data.isNew) {
          const el = textarea.node();
          el.focus();
          el.selectionStart = el.selectionEnd = el.value.length;
          // Reset the flag after focusing
          d.data.isNew = false;
        }
      });
  });

  // Attach interactions to all nodes after rendering (adjust selector for new structure)
  container
    .selectAll("circle.node")
    .on("mouseover", function (event, d) {
      currentNode = this;
      nodeHovered = true;

      if (!brightenedNodes.has(this)) {
        const currentFill = d3.select(this).attr("fill");
        d3.select(this)
          .interrupt()
          .transition()
          .duration(200)
          .attr("fill", d3.color(currentFill).brighter(1.0));

        brightenedNodes.add(this);
      }
      showMenu(this, d);
    })
    .on("mouseout", function (event, d) {
      nodeHovered = false;
      const thisNode = this;

      setTimeout(() => {
        if (!menuHovered && !nodeHovered) {
          const n = d3.select(thisNode).datum();
          const originalFill = getOriginalFill(n);
          d3.select(thisNode)
            .interrupt()
            .transition()
            .duration(100)
            .attr("fill", originalFill);

          brightenedNodes.delete(this);
          hideMenu();
          currentNode = null; // Clear currentNode when mouse leaves and no menu is hovered
        }
      }, 200);
    })

    .on("click", function (event, d) {
      currentNode = this;
      // Toggle nodeClicked state
      nodeClicked = !nodeClicked;
      hideMenu();

      if (nodeClicked) {
        // Find the root group index for this node
        let nodeForRoot = d;
        // Traverse up the hierarchy until the parent is 'data' (the main root of all trees)
        while (nodeForRoot.parent && nodeForRoot.parent.data !== data) {
          nodeForRoot = nodeForRoot.parent;
        }
        const rootIndex = data.children.findIndex(
          (child) => child.id === nodeForRoot.data.id
        );

        // Base group translation
        const baseX = rootIndex * spacingBetweenTrees + width / 2;
        const baseY = height / 2;

        // Node relative position in group
        const [relX, relY] = radialPoint(d.x, d.y);

        // Absolute node position in SVG space
        const absX = baseX + relX;
        const absY = baseY + relY;

        const newScale = 3.5;
        const targetX = width / 2;
        const targetY = height / 2;

        // Calculate translation so node ends up centered after scaling
        const newX = targetX - absX * newScale;
        const newY = targetY - absY * newScale;

        const newTransform = d3.zoomIdentity
          .translate(newX, newY)
          .scale(newScale);

        svg.transition().duration(800).call(zoom.transform, newTransform);
      } else {
        // Reset zoom/pan
        svg.transition().duration(800).call(zoom.transform, lastTransform); // Apply last known transform on zoom out

        const n = d3.select(this).datum();
        const originalFill = getOriginalFill(n);
        d3.select(this).interrupt().attr("fill", originalFill);
      }
    });
}

// ---------------- MAIN TREE RENDER FUNCTION--------------------

// NODEMENU HOVER STATES
// Make sure these are attached after nodemenu is selected in DOMContentLoaded
let colormenuitemHovered = false;
let colormenuHovered = false;

// Consolidated DOMContentLoaded listener
window.addEventListener("DOMContentLoaded", async () => {
  // Initialize D3 selections here, after the DOM is ready
  svg = d3.select("#tree").attr("width", width).attr("height", height);
  container = svg.append("g");

  colormenu = d3
    .select("#color-menu")
    .attr("width", nodeMenuWidth)
    .attr("height", nodeMenuHeight);

  colormenuitem = d3
    .select(".color-menu-item")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  colormenubutton = d3
    .select(".color-menu-button")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  colormenuyellow = d3
    .select(".color-menu-yellow")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  colormenured = d3
    .select(".color-menu-red")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  colormenuorange = d3
    .select(".color-menu-orange")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  colormenugreen = d3
    .select(".color-menu-green")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  colormenubrown = d3
    .select(".color-menu-brown")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  nodemenu = d3
    .select("#node-menu")
    .attr("width", nodeMenuWidth)
    .attr("height", nodeMenuHeight);

  nodemenuitem = d3
    .select(".node-menu-item")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  editmenuitem = d3
    .select(".edit-menu-item")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  addmenuitem = d3
    .select(".add-menu-item")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  deletemenuitem = d3
    .select(".delete-menu-item")
    .attr("width", nodeMenuItemWidth)
    .attr("height", nodeMenuItemHeight);

  newtreebutton = d3.select("#new-tree-button");
  notepadbutton = d3.select("#notepad-button");
  notesForm = d3.select("#notes-form"); // Select notesForm here

  // Initialize Quill after its container is available
  quill = new Quill("#editor", {
    theme: "snow",
  });
  quill.on("text-change", () => {
    debouncedSave(quill.root.innerHTML);
  });

  // Attach event listeners for menus and buttons
  nodemenu
    .on("pointerenter", () => {
      menuHovered = true;
      nodeHovered = true;
    })
    .on("pointerleave", () => {
      menuHovered = false;
      nodeHovered = false;
      setTimeout(checkAndHideAll, 200);
    });

  editmenuitem
    .on("mouseover", function () {
      d3.select(this).style("background", "#ccc");
    })
    .on("click", function () {
      openNotesMenu(this);
    })
    .on("mouseout", function () {
      d3.select(this).style("background", "none");
    });

  addmenuitem
    .on("mouseover", function () {
      d3.select(this).style("background", "#ccc");
    })
    .on("mouseout", function () {
      d3.select(this).style("background", "none");
    })
    .on("click", function () {
      const datum = d3.select(currentNode).datum();
      const parent = datum.data;
      const newnode = createNode("default", "leaf", parent);
      parent.children.push(newnode);
      saveTreeData(data); // Save the entire data object
      treeRender();
    });

  deletemenuitem
    .on("mouseover", function () {
      d3.select(this).style("background", "#ccc");
    })
    .on("mouseout", function () {
      d3.select(this).style("background", "none");
    })
    .on("click", function () {
      if (currentNode) {
        const datum = d3.select(currentNode).datum();
        deleteNode(datum.data.id);
        saveTreeData(data); // Save the entire data object
        treeRender();
        hideMenu();
      }
    });

  colormenuitem
    .on("pointerenter", function () {
      colormenuitemHovered = true;
      showColorMenu(currentNode, d3.select(currentNode).datum());
    })
    .on("pointerleave", function () {
      setTimeout(() => {
        if (!colormenuitemHovered && !colormenuHovered) {
          hideColorMenu();
        }
      }, 200);
      colormenuitemHovered = false;
    });

  colormenu
    .on("pointerenter", () => {
      colormenuHovered = true;
      menuHovered = true;
      nodeHovered = true;
    })
    .on("pointerleave", () => {
      colormenuHovered = false;
      menuHovered = false;
      nodeHovered = false;
      setTimeout(checkAndHideAll, 200);
    });

  colormenubutton
    .on("pointerenter", () => {
      colormenuHovered = true;
      menuHovered = true;
      nodeHovered = true;
    })
    .on("pointerleave", () => {
      colormenuHovered = false;
      menuHovered = false;
      nodeHovered = false;
      setTimeout(checkAndHideAll, 200);
    });

  colormenured
    .on("mouseover", function () {
      d3.select(this).style("background", "#ccc");
    })
    .on("mouseout", function () {
      d3.select(this).style("background", "none");
    })
    .on("click", function () {
      const datum = d3.select(currentNode).datum();
      colorChange(datum.data, "#B50000");
    });

  colormenuorange
    .on("mouseover", function () {
      d3.select(this).style("background", "#ccc");
    })
    .on("mouseout", function () {
      d3.select(this).style("background", "none");
    })
    .on("click", function () {
      const datum = d3.select(currentNode).datum();
      colorChange(datum.data, "#F03000");
    });

  colormenuyellow
    .on("mouseover", function () {
      d3.select(this).style("background", "#ccc");
    })
    .on("mouseout", function () {
      d3.select(this).style("background", "none");
    })
    .on("click", function () {
      const datum = d3.select(currentNode).datum();
      colorChange(datum.data, "#FF9D00");
    });

  colormenugreen
    .on("mouseover", function () {
      d3.select(this).style("background", "#ccc");
    })
    .on("mouseout", function () {
      d3.select(this).style("background", "none");
    })
    .on("click", function () {
      const datum = d3.select(currentNode).datum();
      colorChange(datum.data, "#7ebd78");
    });

  colormenubrown
    .on("mouseover", function () {
      d3.select(this).style("background", "#ccc");
    })
    .on("mouseout", function () {
      d3.select(this).style("background", "none");
    })
    .on("click", function () {
      const datum = d3.select(currentNode).datum();
      colorChange(datum.data, "#310910");
    });

  newtreebutton.on("click", function () {
    addNewTree();
  });

  notepadbutton.on("click", function () {
    openNotesMenu(this);
  });

  // Initialize userId
  userId = getCookie("anonUserId");
  if (!userId) {
    userId = generateUUID();
    setCookie("anonUserId", userId, 365);
  }
  console.log("User ID: ", userId);

  // Apply zoom behavior after SVG and container are ready
  zoom = d3
    .zoom()
    .scaleExtent([0.1, 8]) // min and max zoom levels
    .on("zoom", (event) => {
      lastTransform = event.transform;
      container.attr("transform", event.transform);
    });
  svg.call(zoom);

  // Load tree data and notes
  await loadTreeDataAndRender(); // This will also call treeRender
  const notesRes = await fetch(`/get_notes?userId=${userId}`);
  const notes = await notesRes.json();

  if (notes.length > 0) {
    quill.setContents(quill.clipboard.convert(notes[0].content));
  }
});
