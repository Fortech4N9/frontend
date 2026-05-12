// chartSetup — единая регистрация Chart.js controllers/elements/scales.
// Делается один раз на bundle; все компоненты, которые используют
// vue-chartjs, должны импортировать этот модуль до отрисовки графика.

import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Colors,
  DoughnutController,
  Filler,
  LinearScale,
  Legend,
  LineController,
  LineElement,
  PieController,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'

let registered = false

export function ensureChartsRegistered(): void {
  if (registered) return
  Chart.register(
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    Colors,
    DoughnutController,
    Filler,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PieController,
    PointElement,
    Title,
    Tooltip,
  )
  registered = true
}
