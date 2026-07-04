import dishBiryani from '../assets/dishBiryani.png'
import whiteKarahi from '../assets/whiteKarahi-removebg-preview.png'
import karahi from '../assets/karahi.png'
import chickenPulao from '../assets/chickenPulao.png'
import chane from '../assets/chane.png'
import dahiBhalle from '../assets/dahiBhalle.png'
import russianSalad from '../assets/russianSalad.png'
import rostedChicken from '../assets/rostedChicken.png'
import kari from '../assets/kari.png'

export const WHATSAPP_NUMBER = '923035698404'

export const highlights = [
  { id: 'white-karahi', name: 'White Karahi', sub: 'With salad & roti', price: 400, img: whiteKarahi, alt: 'White chicken karahi' },
  { id: 'chicken-biryani', name: 'Chicken Biryani', sub: 'With raita & salad', price: 400, img: dishBiryani, alt: 'Chicken biryani', featured: true },
  { id: 'chicken-karahi', name: 'Chicken Karahi', sub: 'With roti & salad', price: 400, img: karahi, alt: 'Chicken karahi' },
  { id: 'chicken-pulao', name: 'Chicken Pulao', sub: 'With raita', price: 400, img: chickenPulao, alt: 'Chicken pulao' },
  { id: 'makhni-channay', name: 'Makhni Channay', sub: 'With Russian salad', price: 400, img: chane, alt: 'Makhni channay' },
  { id: 'dahi-bhallay', name: 'Dahi Bhallay', sub: 'Cool & tangy', price: 400, img: dahiBhalle, alt: 'Dahi bhallay' },
  { id: 'russian-salad', name: 'Russian Salad', sub: 'Fresh creamy side', price: 400, img: russianSalad, alt: 'Russian salad' },
  { id: 'roasted-chicken', name: 'Roasted Chicken', sub: 'With sauce & salad', price: 400, img: rostedChicken, alt: 'Roasted chicken' },
  { id: 'kari-pakora', name: 'Kari Pakora', sub: 'With steamed rice', price: 400, img: kari, alt: 'Kari pakora' },
]

export const week1 = [
  { day: 'Mon', n: '01', dish: 'Chicken Karahi + Roti' },
  { day: 'Tue', n: '02', dish: 'Mix Sabzi + Zeera Rice' },
  { day: 'Wed', n: '03', dish: 'Koftay + Khamiri Roti' },
  { day: 'Thu', n: '04', dish: 'Daal Chawal + Shami' },
  { day: 'Fri', n: '05', dish: 'Beef Pulao + Raita', highlight: true },
]
export const week2 = [
  { day: 'Mon', n: '01', dish: 'Bhindi Masala + Roti' },
  { day: 'Tue', n: '02', dish: 'Chicken Haleem + Naan' },
  { day: 'Wed', n: '03', dish: 'Aloo Qeema + Paratha' },
  { day: 'Thu', n: '04', dish: 'Lauki Gosht + Roti' },
  { day: 'Fri', n: '05', dish: 'Chicken Biryani + Salad', highlight: true },
]

export const weeklyPlans = [
  { number: '01', label: 'Week One Plan', title: 'Traditional Classics', items: week1 },
  { number: '02', label: 'Week Two Plan', title: 'Healthy Homestyle', items: week2 },
]

export const offers = [
  { tag: 'Family Bundle', title: 'Free Dessert Fridays', text: 'Order for 4 people or more and get a free homemade Kheer bowl every Friday.' },
  { tag: 'Corporate Box', title: 'Bulk Order Discount', text: '15% off on daily office lunch boxes for teams larger than 10 members.' },
  { tag: 'New Joiner', title: 'First Week Free', text: 'Subscribe for a month and get your first 3 meals absolutely free of charge.' },
]

export const stats = [
  { value: 5, suffix: '+', label: 'Dishes' },
  { value: 50, suffix: '+', label: 'Happy Families' },
  { value: 10, suffix: '+', label: 'Areas Covered' }, 
  { value: 100, suffix: '%', label: 'Cook Fresh Daily' } 
]
