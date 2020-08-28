module.exports = {
  entry: {
    'functions/create-licence': './functions/create-licence.js',
    'functions/delete-licence': './functions/delete-licence.js',
    'functions/get-licence': './functions/get-licence.js',
    'functions/update-licence': './functions/update-licence.js',
    'functions/update-contact': './functions/update-contact.js',
    'functions/qldbIndex': './functions/qldbIndex.js',
    'functions/qldbTable': './functions/qldbTable.js',
  },
  mode: 'production',
  target: 'node',
};
