const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        quantity: {
          type: Number,
          required: true
        }
      }
    ]
  }
});

userSchema.methods.addToCart = function(product) {
  let updatedCartItems = [...this.cart.items];
  const itemIndex = updatedCartItems.findIndex(
    item => item.product.toString() === product._id.toString()
  );
  if (itemIndex > -1) {
    ++updatedCartItems[itemIndex].quantity;
  } else {
    updatedCartItems = [
      ...updatedCartItems,
      { product: product._id, quantity: 1 }
    ];
  }
  this.cart.items = updatedCartItems;
  return this.save();
};

userSchema.methods.removeFromCart = function(productId) {
  this.cart.items = this.cart.items.filter(
    ({ product }) => product.toString() !== productId
  );
  return this.save();
};

userSchema.methods.getCart = async function() {
  const user = await this.populate('cart.items.product').execPopulate();
  const products = user.cart.items.filter(item => item.product);
  if (products.length < user.cart.items.length) {
    user.cart.items = user.cart.items.filter(item => item.product);
    await user.save();
  }
  return products;
};

userSchema.methods.clearCart = function() {
  this.cart.items = [];
  return this.save();
};

module.exports = model('User', userSchema);
