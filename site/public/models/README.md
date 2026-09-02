# CAD model exports

Drop `.glb` files here to turn the 3D model slots in the case studies into
orbitable views of the real parts.

Suggested exports:

| Filename | Used by |
| --- | --- |
| `drivetrain.glb` | Forty Drivetrains — act 01, "Design for the forty, not the one" |
| `terraprobe.glb` | TerraProbe — sampling mechanism |
| `drone-platform.glb` | Offshore drone landing platform |

## Exporting from SolidWorks

SolidWorks has no direct glTF export, so go via one of:

1. **SolidWorks → STEP → Blender → glTF 2.0 (.glb)** — best fidelity, and Blender
   lets you decimate the mesh before export.
2. **SolidWorks → STL → Blender → .glb** — quicker, loses assembly structure.

Keep each file under roughly 5 MB. In Blender, use *Decimate* on heavy bodies and
delete internal geometry that will never be seen; a portfolio viewer does not need
manufacturing-grade tessellation.

Then set `modelSrc="/models/drivetrain.glb"` on the relevant `<InteractiveSlot>`.
