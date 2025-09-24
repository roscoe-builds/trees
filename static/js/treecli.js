// initialize id counter
const { create } = require("domain");
const { stdin } = require("process");
const readline = require("readline");
const { stringify } = require("flatted");

rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let idCounter = 1;

function createNode(name, type = "leaf", parent = null) {
  return {
    id: idCounter++,
    name,
    type,
    notes: "",
    parent,
    children: [],
    progress: { label: "", color: "" },
  };
}

const root = createNode("My Project", "root");

function searchTree(node, name) {
  if (node.name === name) return node;

  for (let child of node.children) {
    const found = searchTree(child, name);
    if (found) return found;
  }

  return null;
}

function safeTreeView(node) {
  const copy = {
    id: node.id,
    name: node.name,
    type: node.type,
    notes: node.notes,
    progress: node.progress,
    children: node.children.map(safeTreeView),
  };
  return copy;
}

function treeEdit() {
  rl.question(
    "Would you like to view, add, delete, edit, or exit your node tree?",
    (answer) => {
      switch (answer.trim().toLowerCase()) {
        case "view":
          console.log(JSON.stringify(safeTreeView(root), null, 2));
          treeEdit();
          break;

        case "add":
          rl.question("Parent: ", (parent) => {
            const foundParent = searchTree(root, parent);

            if (!foundParent) {
              console.log("Parent not found");
              treeEdit();
            }

            if (foundParent.type == "leaf") {
              console.log(
                "You cannot add children to leaf tasks. Please change the given leaf to a branch or find a different parent"
              );
              treeEdit();
            } else {
              let nodeParent = parent;

              rl.question("Name: ", (name) => {
                let foundName = searchTree(root, name);

                if (foundName) {
                  console.log("This node already exists!");
                  treeEdit();
                } else {
                  let nodeName = name;

                  rl.question("Type (branch/leaf): ", (type) => {
                    if (!type === "branch" || !type === "leaf") {
                      console.log("Please enter a valid node type");
                      treeEdit();
                    } else {
                      let nodeType = type;

                      rl.question("Notes: ", (notes) => {
                        let userNotes = notes;

                        const newNode = createNode(name, type, parent);
                        newNode.notes = userNotes;

                        foundParent.children.push(newNode);

                        console.log(
                          "New node " +
                            newNode.name +
                            "successfully added! Type 'view' to view updated tree"
                        );
                        treeEdit();
                      });
                    }
                  });
                }
              });
            }
          });
          break;

        // delete a mode
        case "delete":
          rl.question("Which node would you like to delete? ", (name) => {
            let foundNode = searchTree(root, name);

            if (!foundNode) {
              console.log("This node does not exist. Please tree again. ");
              treeEdit();
            } else {
              if (foundNode.type == "root") {
                console.log(
                  "You are not allowed to delete the root object. Try a different object"
                );
                treeEdit();
              } else {
                const parentNode = searchTree(root, foundNode.parent);

                if (!parentNode) {
                  console.log("No parent node found for deletion. ");
                  treeEdit();
                  return;
                }
                const indexToRemove = parentNode.children.findIndex(
                  (child) => child.id === foundNode.id
                );

                if (indexToRemove > -1) {
                  parentNode.children.splice(indexToRemove, 1);
                  console.log(
                    `Node '${foundNode.name}' and its children have been successfully deleted.`
                  );
                  treeEdit();
                } else {
                  console.log(
                    "The node could not be found in it's parent's children list"
                  );
                  treeEdit();
                }
              }
            }
          });
          break;

        case "edit":
          // should be able to update:
          // name
          // branch -> leaf (that branch becomes siblings with all its children) (even if the branch is first layer past root)
          // leaf -> branch (shouldnt' have problems here)
          // switch parent (moves everything and its chidlren to different children array) (coudl be root, another branch, but NOT A LEAF (they can't be parents))
          // notes

          // which node would you like to update
          rl.question("Which node woudl you like to update? ", (node) => {
            let foundNode = searchTree(root, node);
            // if it doens't exist
            if (!foundNode) {
              // tell the user
              console.log(
                "This node doesn't exist and cannot be edited. Try again."
              );
              treeEdit();
            }

            rl.question(
              `What would you like to edit about '${foundNode.name}?' (name, type (boundaries to this), parent, or notes)`,
              (edit) => {
                switch (edit.trim().toLowerCase()) {
                  case "name":
                    rl.question(
                      `What would you like to change '${foundNode.name}'s name to? `,
                      (newname) => {
                        let alreadyTaken = searchTree(root, newname);

                        if (alreadyTaken) {
                          console.log(
                            "You cannot change your name to this, as it is already taken. Please try a different name"
                          );
                          treeEdit();
                        } else {
                          foundNode.name = newname;
                          console.log(
                            `Your node's name has successfully been updated to '${newname}'`
                          );
                          treeEdit();
                        }
                      }
                    );

                  case "notes":
                    rl.question(
                      `'${foundNode.name}'s notes are currently this: 

                      '${foundNode.notes}'
                      
                      What would you like to change about these notes?`,
                      (newnotes) => {
                        foundNode.notes = newnotes;
                        console.log(
                          "Notes successfully changed. Zoom out to see new notes."
                        );
                        treeEdit();
                      }
                    );

                  case "type":
                    if (foundNode.type === "root") {
                      console.log(
                        "You cannot change the type of the root, please try a different branch/leaf. "
                      );
                      treeEdit();
                    }

                    if (foundNode.type == "branch") {
                      rl.question(
                        "Your node is about to be changed form a branch to a leaf. Its children will become siblings with it. Are you sure you want to proceed? (y/n)",
                        (answer) => {
                          if (answer === "n" || answer === "N") {
                            treeEdit();
                          }

                          if (answer === "Y" || answer === "y") {
                            // for each of the node's children
                            rl.question(
                              "Confirm by typing your node's parent",
                              (nodeParent) => {
                                const parent = searchTree(root, nodeParent);
                                if (!parent) {
                                  console.log("Confirmation failed");
                                  treeEdit();
                                } else {
                                  console.log(`Moving node's children up one level...
                                  `);

                                  foundNode.type = "leaf";

                                  for (const child of foundNode.children) {
                                    // find the index of the child
                                    const index =
                                      foundNode.children.indexOf(child);
                                    // remove each of the chidlren form this list (to reset to new children list)
                                    if (index !== -1) {
                                      foundNode.children.splice(index, 1);
                                    }
                                    // update their parent to the current node's parent
                                    child.parent = parent;
                                    parent.children.push(child);
                                  }

                                  console.log(
                                    "Your node's status has been updated from a branch to a leaf."
                                  );
                                  treeEdit();
                                }
                              }
                            );

                            // then, update the status of the current node from branch to leaf
                          }
                        }
                      );
                    }

                    if (foundNode.type === "leaf") {
                      rl.question(
                        `You are about to change your node's type from a leaf to a branch. Are you sure you want to proceed? (y/n)
                      `,
                        (answer) => {
                          if (answer === "n" || answer == "N") {
                            treeEdit();
                          }

                          if (answer === "Y" || answer == "y") {
                            foundNode.type = "branch";
                            console.log(
                              "Your node has successfully been updated from a leaf to a branch."
                            );
                            treeEdit();
                          } else {
                            console.log(
                              "Please enter a valid response to the question."
                            );
                            treeEdit();
                          }
                        }
                      );
                    }
                }
              }
            );
          });

          // what would you liek to edit about it? (name, type (limits), parent, notes)
          // if they don't select any of these, tell the user and retry
          // if name already exists, ask them to try again
          // if going from branch to leaf, set that node's children's new parent to the current node's parent, then change the current node's status to leaf (they are all siblings now)
          // if going from leaf to branch, no probelms
          // change the parent, remove old parent (or vice versa)  (make sure that all the node's children are moved with it)

          break;
        case "exit":
          rl.close();
          break;

        // if the user doesn't tyep any valid case
        default:
          console.log(
            "Invalid command. Please enter 'view', 'add', 'delete', 'edit', or 'exit'."
          );
          treeEdit(); // Prompt the user again
          break;
      }
    }
  );
}

treeEdit();
