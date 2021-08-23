import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { CSSReset,ThemeProvider, ColorModeProvider } from "@chakra-ui/core";
import theme from "../theme";


function MyApp({ Component, pageProps }: any) {
  return (
   
      <ThemeProvider theme={theme}>
        <ColorModeProvider
        // options={{
        //   useSystemColorMode: true,
        // }}
        >
          <CSSReset />
          <Component {...pageProps} />
        </ColorModeProvider>
      </ThemeProvider>
   
  );
}

export default MyApp;
