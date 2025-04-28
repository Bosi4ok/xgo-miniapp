// u0424u0443u043du043au0446u0438u044f u0434u043bu044f u043fu043eu043bu0443u0447u0435u043du0438u044f u0438u043cu0435u043du0438 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f u0438u0437 Telegram
async function getTelegramUserName() {
  try {
    console.log('u041du0430u0447u0430u043bu043e u043fu043eu043bu0443u0447u0435u043du0438u044f u0438u043cu0435u043du0438 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f u0438u0437 Telegram...');
    
    // u041fu0440u043eu0432u0435u0440u044fu0435u043c, u0435u0441u0442u044c u043bu0438 u0434u0430u043du043du044bu0435 u0432 u0433u043bu043eu0431u0430u043bu044cu043du043eu043c u043eu0431u044au0435u043au0442u0435 TelegramUserData
    if (window.TelegramUserData && window.TelegramUserData.isLoaded) {
      console.log('u0418u0441u043fu043eu043bu044cu0437u0443u0435u043c u0434u0430u043du043du044bu0435 u0438u0437 u0433u043bu043eu0431u0430u043bu044cu043du043eu0433u043e u043eu0431u044au0435u043au0442u0430 TelegramUserData');
      
      if (window.TelegramUserData.first_name) {
        const fullName = `${window.TelegramUserData.first_name}${window.TelegramUserData.last_name ? ' ' + window.TelegramUserData.last_name : ''}`;
        console.log('u041fu043eu043bu0443u0447u0435u043du043e u0438u043cu044f u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f u0438u0437 TelegramUserData:', fullName);
        return fullName;
      }
    }
    
    // u041fu0440u043eu0432u0435u0440u044fu0435u043c, u0435u0441u0442u044c u043bu0438 u0438u043cu044f u0432 localStorage
    const savedName = localStorage.getItem('telegram_user_name');
    if (savedName) {
      console.log('u041du0430u0439u0434u0435u043du043e u0438u043cu044f u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f u0432 localStorage:', savedName);
      return savedName;
    }
    
    // u041fu044bu0442u0430u0435u043cu0441u044f u043fu043eu043bu0443u0447u0438u0442u044c u0438u043cu044f u0438u0437 Telegram WebApp u043du0430u043fu0440u044fu043cu0443u044e
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      console.log('u041fu043eu043bu0443u0447u0435u043d u043eu0431u044au0435u043au0442 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f u0438u0437 Telegram WebApp:', user);
      
      if (user.first_name) {
        const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
        console.log('u041fu043eu043bu0443u0447u0435u043du043e u0438u043cu044f u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f u0438u0437 Telegram WebApp:', userName);
        localStorage.setItem('telegram_user_name', userName);
        return userName;
      }
    }
    
    // u0415u0441u043bu0438 u043du0435 u0443u0434u0430u043bu043eu0441u044c u043fu043eu043bu0443u0447u0438u0442u044c u0438u043cu044f, u0432u043eu0437u0432u0440u0430u0449u0430u0435u043c u0437u043du0430u0447u0435u043du0438u0435 u043fu043e u0443u043cu043eu043bu0447u0430u043du0438u044e
    console.log('u041du0435 u0443u0434u0430u043bu043eu0441u044c u043fu043eu043bu0443u0447u0438u0442u044c u0438u043cu044f u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f, u0432u043eu0437u0432u0440u0430u0449u0430u0435u043c u0437u043du0430u0447u0435u043du0438u0435 u043fu043e u0443u043cu043eu043bu0447u0430u043du0438u044e');
    return 'Player';
  } catch (error) {
    console.error('u041eu0448u0438u0431u043au0430 u043fu0440u0438 u043fu043eu043bu0443u0447u0435u043du0438u0438 u0438u043cu0435u043du0438 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f:', error);
    return 'Player';
  }
}
