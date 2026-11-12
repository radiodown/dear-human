// Body-local frame: +Y up, +Z forward. Forward cross up gives anatomical right (-X).
// Facing changes rotate this frame; they never exchange the anatomical hands.
export const RIGHT_SIDE=-1;
export const LEFT_SIDE=1;
export const isRightSide=sign=>sign===RIGHT_SIDE;
