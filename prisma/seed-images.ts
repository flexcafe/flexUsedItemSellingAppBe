/**
 * Source images downloaded by the development seeder.
 *
 * These are real, openly hosted product photos from Wikimedia Commons. At seed
 * time each source is downloaded, uploaded to the Supabase product-image bucket
 * (`SUPABASE_PRODUCT_IMAGE_BUCKET`, default `listing-images`), and the bucket
 * public URL is what gets persisted on `listing_images.url`.
 *
 * The URLs are hardcoded so the source set is deterministic and does not depend
 * on an image-search API. Every source URL was verified to return HTTP 200 with
 * an image content type.
 */
export const PRODUCT_IMAGE_SOURCES = {
  'iphone-13-pro-max':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Apple_iPhone_13_Pro_and_13_Pro_Max.jpg/1280px-Apple_iPhone_13_Pro_and_13_Pro_Max.jpg',
  'galaxy-s22-ultra':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Back_of_the_Samsung_Galaxy_S22_Ultra.jpg/1280px-Back_of_the_Samsung_Galaxy_S22_Ultra.jpg',
  'redmi-note-12-pro':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Redmi_Note_12_front.jpg/1280px-Redmi_Note_12_front.jpg',
  'ipad-air-5':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/IPad_Air_2020_%2851012790753%29.jpg/1280px-IPad_Air_2020_%2851012790753%29.jpg',
  'macbook-air-m1':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/MacBook_Air_M1.png/1280px-MacBook_Air_M1.png',
  'dell-xps-13':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/DELL_XPS_13_and_15_%2837080596413%29.jpg/1280px-DELL_XPS_13_and_15_%2837080596413%29.jpg',
  'thinkpad-t14':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/ThinkPad_T14.jpg/1280px-ThinkPad_T14.jpg',
  'sony-wh1000xm4':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Sony_Headphones_%2840476165073%29.jpg/1280px-Sony_Headphones_%2840476165073%29.jpg',
  'jbl-charge-5':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/JBL_Charge_4_2v2.jpg/1280px-JBL_Charge_4_2v2.jpg',
  'anker-power-bank':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/2023_Powerbank_Anker_Powercore_5000mAh.jpg/1280px-2023_Powerbank_Anker_Powercore_5000mAh.jpg',
  'canon-eos-200d':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Canon_EOS_200D_II.jpg/1280px-Canon_EOS_200D_II.jpg',
  'sony-a6400':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/2022-02-17_Sony_alpha_6400_IMG20220217210008.jpg/1280px-2022-02-17_Sony_alpha_6400_IMG20220217210008.jpg',
  'gopro-hero-10':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/GoPro_Hero_10_Black_with_battery_door_open.jpg/1280px-GoPro_Hero_10_Black_with_battery_door_open.jpg',
  'playstation-5':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Black_and_white_Playstation_5_base_edition_with_controller.png/1280px-Black_and_white_Playstation_5_base_edition_with_controller.png',
  'nintendo-switch-oled':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/Nintendo_Switch_%E2%80%93_OLED-Modell_mit_gedockter_Konsole_20230506_HOF01624_RAW-Export.png/1280px-Nintendo_Switch_%E2%80%93_OLED-Modell_mit_gedockter_Konsole_20230506_HOF01624_RAW-Export.png',
  'xbox-series-s':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/Xbox_Series_S_with_controller.jpg/1280px-Xbox_Series_S_with_controller.jpg',
  'logitech-g-pro-x':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/RGB_gaming_headset_on_desk_with_ambient_lighting.jpg/1280px-RGB_gaming_headset_on_desk_with_ambient_lighting.jpg',
  'ikea-malm-bed':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Malm_bed_from_Ikea%2C_Brisbane%2C_Australia.jpg/1280px-Malm_bed_from_Ikea%2C_Brisbane%2C_Australia.jpg',
  'dining-table-set':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/Dining_table_brown.jpg/1280px-Dining_table_brown.jpg',
  'fabric-sofa':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Sofa%2C_Couch%2C_Studio%2C_Rostov-on-Don%2C_Russia.jpg/1280px-Sofa%2C_Couch%2C_Studio%2C_Rostov-on-Don%2C_Russia.jpg',
  'lg-air-conditioner':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Split_LG_Dual_Inverter_1.jpg/1280px-Split_LG_Dual_Inverter_1.jpg',
  'samsung-washing-machine':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/SAMSUNG_WASHING_MACHINE_%282%29.jpg/1280px-SAMSUNG_WASHING_MACHINE_%282%29.jpg',
  'panasonic-refrigerator':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Panasonic_HOME_REFRIGERATOR_NR-C320WP-N.jpg/1280px-Panasonic_HOME_REFRIGERATOR_NR-C320WP-N.jpg',
  'honda-wave-125i':
    'https://upload.wikimedia.org/wikipedia/commons/e/e5/2022_Honda_Wave_125i_%28Alloy%29.png',
  'honda-click-125i':
    'https://upload.wikimedia.org/wikipedia/commons/8/8c/2022_Honda_Click_160_ABS.jpg',
  'toyota-corolla-2015':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/2016_Toyota_Corolla_%28ZRE172R%29_Ascent_sedan_%282017-01-15%29_01.jpg/1280px-2016_Toyota_Corolla_%28ZRE172R%29_Ascent_sedan_%282017-01-15%29_01.jpg',
  'giant-escape-3':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Giant_Escape_M2.jpg/1280px-Giant_Escape_M2.jpg',
  'mountain-bike':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Orbea_Occam_2020.jpg/1280px-Orbea_Occam_2020.jpg',
  'nike-air-force-1':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/Nike_air_Force_1_white_on_white.jpg/1280px-Nike_air_Force_1_white_on_white.jpg',
  'adidas-ultraboost-22':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Adidas_Ultra_Boost_4_running_shoes.jpeg/1280px-Adidas_Ultra_Boost_4_running_shoes.jpeg',
  'levis-501':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Levi%27s_501_jeans_%27small_e%27_Red_Tab_%282025-12-19%29_4.jpg/1280px-Levi%27s_501_jeans_%27small_e%27_Red_Tab_%282025-12-19%29_4.jpg',
  'uniqlo-down-jacket':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/Men%27s_black_PVC_down_jacket_02.jpg/1280px-Men%27s_black_PVC_down_jacket_02.jpg',
  'coach-tabby-bag':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Handbag_at_Nordstrom_Rack_-_Santa_Rosa_-_December_2022_-_Sarah_Stierch.jpg/1280px-Handbag_at_Nordstrom_Rack_-_Santa_Rosa_-_December_2022_-_Sarah_Stierch.jpg',
  'casio-g-shock':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/CASIO_G-Shock_GW-M5610U.jpg/1280px-CASIO_G-Shock_GW-M5610U.jpg',
  'rayban-aviator':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Ray-Ban_Aviator_sunglasses.jpg/1280px-Ray-Ban_Aviator_sunglasses.jpg',
  'yamaha-f310':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/12_string_Yamaha_acoustic_guitar.jpg/1280px-12_string_Yamaha_acoustic_guitar.jpg',
  'roland-fp-10':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Roland_FP-90X_at_Roland_Taiwan_Enterprise_booth_20221224.jpg/1280px-Roland_FP-90X_at_Roland_Taiwan_Enterprise_booth_20221224.jpg',
  'dyson-v8':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Dyson_V8_handstick_vacuum.jpg/1280px-Dyson_V8_handstick_vacuum.jpg',
  'baby-stroller':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/Baby_pram.jpg/1280px-Baby_pram.jpg',
  'lego-city-rocket':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Lego_Space_-_Set_462_Mobile_Rocket_Launcher_%287465211022%29.jpg/1280px-Lego_Space_-_Set_462_Mobile_Rocket_Launcher_%287465211022%29.jpg',
} as const;

export type ProductImageKey = keyof typeof PRODUCT_IMAGE_SOURCES;
