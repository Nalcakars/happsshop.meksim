/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        spot: {
          primary: "#845ec2",
          secondary: "#b39cd0",
          surface: "#fbeaff",
          accent: "#00c9a7",
          ink: "#1f1b2e",
          muted: "#6b6282",
          border: "rgba(132, 94, 194, 0.18)",
        },
      },
    },
  },
  plugins: [],
};
