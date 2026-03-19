const appJson = require("./app.json");

const existingExpoConfig = appJson?.expo || {};
const existingExtra = existingExpoConfig.extra || {};
const existingPlugins = Array.isArray(existingExpoConfig.plugins) ? existingExpoConfig.plugins : [];

module.exports = {
  expo: {
    ...existingExpoConfig,
    extra: {
      ...existingExtra,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    },
    plugins: [
      ...existingPlugins.filter((plugin) => {
        if (Array.isArray(plugin)) {
          return plugin[0] !== "@stripe/stripe-react-native";
        }
        return plugin !== "@stripe/stripe-react-native";
      }),
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.glo",
          enableGooglePay: false,
        },
      ],
    ],
  },
};
