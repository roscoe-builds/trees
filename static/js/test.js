const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function promptUser() {
  rl.question(
    "What do you want to do? (add, delete, view, exit): ",
    (action) => {
      switch (action.trim().toLowerCase()) {
        case "add":
          rl.question("Parent node name: ", (parent) => {
            if (parent)
              rl.question("New node name: ", (child) => {
                console.log(`Added ${child} under ${parent}`);
                promptUser(); // repeat
              });
          });
          break;

        case "delete":
          rl.question("Node to delete: ", (node) => {
            console.log(`Deleted ${node}`);
            promptUser();
          });
          break;

        case "view":
          console.log("Showing tree...");
          // call your tree-printing function here
          promptUser();
          break;

        case "exit":
          console.log("Goodbye!");
          rl.close();
          break;

        default:
          console.log("Invalid option.");
          promptUser();
      }
    }
  );
}

promptUser();
