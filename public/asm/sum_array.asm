; Sum Array - Calculate sum of N numbers
; Expected: R0 = 15 (sum of 1+2+3+4+5)

.DATA
array: .WORD 1, 2, 3, 4, 5
count: .WORD 5

.TEXT
    ; Load array address and count
    MOV R1, array      ; R1 = array address
    LOAD R2, [count]   ; R2 = count
    MOV R0, #0         ; R0 = sum (result)
    MOV R3, #0         ; R3 = index

loop:
    CMP R3, R2         ; Compare index with count
    JZ done            ; Jump if equal (done)
    
    LOAD R4, [R1]      ; Load array[index]
    ADD R0, R4         ; sum += array[index]
    ADD R1, #4         ; Move to next word (4 bytes)
    ADD R3, #1         ; index++
    
    JMP loop           ; Continue loop

done:
    HALT               ; Stop execution