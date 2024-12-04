import * as React from "react"
import { SVGProps } from "react"
import Svg, { G, Path, Defs } from "react-native-svg"
import { motion } from "framer-motion"
/* SVGR has dropped some elements not supported by react-native-svg: filter */
export const WaveCushionSVG = (props: SVGProps<SVGSVGElement>) => (
  <Svg
    // width={711}
    // height={244}
    viewBox="0 0 711 244"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <G id="WaveCushion">
      <G id="Zones">
        <G id="ZoneA1" filter="url(#filter0_d_1_15)">
          <Path
            d="M25 9.99999C25 4.47715 29.4772 0 35 0H119C124.523 0 129 4.47715 129 10V227H25V9.99999Z"
            fill="#696363"
          />
        </G>
        <G id="ZoneC1" filter="url(#filter1_d_1_15)">
          <Path
            d="M247 9.99999C247 4.47715 251.477 0 257 0H341C346.523 0 351 4.47715 351 10V227H247V9.99999Z"
            fill="#696363"
          />
        </G>
        <G id="ZoneB1" filter="url(#filter2_d_1_15)">
          <Path
            d="M136 9.99999C136 4.47715 140.477 0 146 0H230C235.523 0 240 4.47715 240 10V227H136V9.99999Z"
            fill="#696363"
          />
        </G>
        <G id="ZoneA2" filter="url(#filter3_d_1_15)">
          <Path
            d="M358 9.99999C358 4.47715 362.477 0 368 0H452C457.523 0 462 4.47715 462 10V227H358V9.99999Z"
            fill="#696363"
          />
        </G>
        <G id="ZoneC2" filter="url(#filter4_d_1_15)">
          <Path
            d="M580 9.99999C580 4.47715 584.477 0 590 0H674C679.523 0 684 4.47715 684 10V227H580V9.99999Z"
            fill="#696363"
          />
        </G>
        <G id="ZoneB2" filter="url(#filter5_d_1_15)">
          <Path
            d="M469 9.99999C469 4.47715 473.477 0 479 0H563C568.523 0 573 4.47715 573 10V227H469V9.99999Z"
            fill="#696363"
          />
        </G>
      </G>
      <G id="Base">
        <Path
          id="Base_2"
          d="M0 244C0 234.611 7.61116 227 17 227H694C703.389 227 711 234.611 711 244H0Z"
          fill="#524F4F"
        />
      </G>
    </G>
    <Defs></Defs>
  </Svg>
)
export { WaveCushionSVG as ReactComponent }
